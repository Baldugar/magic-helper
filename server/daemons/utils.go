package daemons

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

func shouldDownloadStart(record string) (bool, error) {
	var appConfig model.MTGApplicationConfig
	ctx := context.Background()

	col, err := arango.EnsureDocumentCollection(ctx, arango.APPLICATION_CONFIG_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error ensuring application config collection")
		return false, err
	}

	exists, err := col.DocumentExists(ctx, record)
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if document exists")
		return false, err
	}

	if exists {
		_, err := col.ReadDocument(ctx, record, &appConfig)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return false, err
		}

		log.Info().Str("record", record).Msgf("Last time fetched: %v", appConfig.LastTimeFetched)

		// If we fetched sets in the last 24 hours, don't fetch again
		if util.Now() < appConfig.LastTimeFetched+24*60*60*1000 {
			log.Info().Str("record", record).Msg("Already fetched in the last 24 hours")
			return false, nil
		} else {
			return true, nil
		}
	} else {
		appConfig = model.MTGApplicationConfig{
			ID:              record,
			LastTimeFetched: 0,
		}
		_, err := col.CreateDocument(ctx, appConfig)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating document")
			return false, err
		}
		return true, nil
	}
}

func updateLastTimeFetched(record string) error {
	var appConfig model.MTGApplicationConfig
	ctx := context.Background()

	col, err := arango.EnsureDocumentCollection(ctx, arango.APPLICATION_CONFIG_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error ensuring application config collection")
		return err
	}

	_, err = col.ReadDocument(ctx, record, &appConfig)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading document")
		return err
	}

	appConfig.LastTimeFetched = util.Now()

	_, err = col.UpdateDocument(ctx, record, appConfig)
	if err != nil {
		log.Error().Err(err).Msgf("Error updating document")
		return err
	}

	return nil
}

func createScryfallRequest(url string) (*http.Request, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Error().Err(err).Msgf("Error creating request to Scryfall")
		return nil, err
	}
	req.Header.Set("User-Agent", "MagicHelper/0.1")
	req.Header.Set("Accept", "application/json")

	return req, nil
}

// Download the JSON file and store it in the filesystem, returning the path to the file
func DownloadScryfallJSONFile(url string, fileName *string) (string, error) {
	log.Info().Msgf("Downloading JSON file from %v", url)

	// Fetch the data from the API
	req, err := createScryfallRequest(url)
	if err != nil {
		log.Error().Err(err).Msgf("Error creating request to Scryfall")
		return "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Error().Err(err).Msgf("Error fetching cards from Scryfall")
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		log.Error().Msgf("Error fetching cards from Scryfall: %v", resp.Status)
		return "", err
	}

	// Create a temporary file
	name := "file.json"
	if fileName != nil {
		name = *fileName
	}
	file, err := os.Create(name)
	if err != nil {
		log.Error().Err(err).Msgf("Error creating temporary file")
		return "", err
	}

	// Write the response body to the file
	_, err = io.Copy(file, resp.Body)
	if err != nil {
		log.Error().Err(err).Msgf("Error writing response body to file")
		return "", err
	}

	// Close the file
	err = file.Close()
	if err != nil {
		log.Error().Err(err).Msgf("Error closing file")
		return "", err
	}

	// Close the response body
	err = resp.Body.Close()
	if err != nil {
		log.Error().Err(err).Msgf("Error closing response body")
		return "", err
	}

	return file.Name(), nil
}

func parseCardsFromRaw(allCards []json.RawMessage) ([]map[string]any, error) {
	cards := []map[string]any{}
	for _, card := range allCards {
		var cardMap map[string]any
		err := json.Unmarshal(card, &cardMap)
		if err != nil {
			log.Error().Err(err).Str("card", string(card)).Msgf("Error unmarshalling card")
			return nil, err
		}
		cards = append(cards, cardMap)
	}
	return cards, nil
}

func upsertOriginalCards(ctx context.Context, cards []map[string]any) error {
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c.id }
			INSERT MERGE({ _key: c.id }, c)
			UPDATE c
			IN MTG_Original_Cards
	`)

	aq.AddBindVar("cards", cards)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return err
	}

	return nil
}

func createScryfallRequestWithContext(ctx context.Context, url string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func fetchURLWithContext(ctx context.Context, url string) (*http.Response, error) {
	req, err := createScryfallRequestWithContext(ctx, url)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %s", resp.Status)
	}
	return resp, nil
}

// Helper function to sanitize filenames (replace invalid characters)
// You might need a more robust implementation depending on expected names
func SanitizeFilename(name string) string {
	// Example: Replace slashes with underscores
	// You might want to handle other characters like :, ?, *, etc.
	// and potentially truncate long names.
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, " // ", "_") // Handle the specific pattern
	// Add more replacements as needed for Windows/Linux compatibility
	name = strings.ReplaceAll(name, ":", "_")
	name = strings.ReplaceAll(name, "*", "_")
	name = strings.ReplaceAll(name, "?", "_")
	name = strings.ReplaceAll(name, "\"", "_")
	name = strings.ReplaceAll(name, "<", "_")
	name = strings.ReplaceAll(name, ">", "_")
	name = strings.ReplaceAll(name, "|", "_")
	return name
}

// Helper function to download an image from a URL
func DownloadImage(url string, filePath string) error {
	// Check if URL is empty
	if url == "" {
		return fmt.Errorf("empty URL provided for download")
	}

	log.Debug().Msgf("Downloading image from %s to %s", url, filePath)
	// Use a client with a timeout
	client := http.Client{
		Timeout: 30 * time.Second, // Set a reasonable timeout
	}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("error fetching image URL %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Attempt to read body for more info, but don't fail if read fails
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024)) // Limit read size
		return fmt.Errorf("bad status fetching image %s: %s. Body sample: %s", url, resp.Status, string(bodyBytes))
	}

	// Create the file
	out, err := os.Create(filePath)
	if err != nil {
		// Attempt to remove partially created file on error
		_ = os.Remove(filePath)
		return fmt.Errorf("error creating image file %s: %w", filePath, err)
	}
	defer out.Close() // Ensure file is closed

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		// Attempt to remove partially written file on error
		_ = os.Remove(filePath)
		return fmt.Errorf("error saving image file %s: %w", filePath, err)
	}

	// Explicitly close before returning nil to flush buffers
	closeErr := out.Close()
	if closeErr != nil {
		// Report close error, but image might be mostly fine
		log.Warn().Err(closeErr).Msgf("Error closing image file %s after writing", filePath)
		// Don't necessarily return error here, as copy succeeded
	}

	return nil
}

// Helper function to find a unique file path by appending a number if necessary
func FindUniqueFilePath(dir, baseName, extension string) string {
	filePath := filepath.Join(dir, fmt.Sprintf("%s%s", baseName, extension))
	counter := 1
	// Check if the *base file* exists first
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return filePath // Base name is unique
	}

	// If base file exists, start appending numbers
	for {
		filePath = filepath.Join(dir, fmt.Sprintf("%s_%d%s", baseName, counter, extension))
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			return filePath // Found a unique numbered path
		}
		counter++
		// Safety break to prevent infinite loops in unexpected scenarios
		if counter > 10000 {
			log.Error().Msgf("Could not find unique filename for base %s in dir %s after 10000 attempts", baseName, dir)
			// Return the last tried path, it will likely fail the download but prevents hanging
			return filePath
		}
	}
}
