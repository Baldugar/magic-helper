package daemons

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/graph/model/scryfall"
	"magic-helper/util"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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

func upsertOriginalCards(ctx context.Context, cards []map[string]any, collection arango.ArangoDocument) error {
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c.id }
			INSERT MERGE({ _key: c.id }, c)
			UPDATE c
			IN @@collection
	`)

	aq.AddBindVar("cards", cards)
	aq.AddBindVar("@collection", collection)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return err
	}

	return nil
}

// func updateDatabaseCards(source arango.ArangoDocument, target arango.ArangoDocument) error {
// 	log.Info().Msg("Updating database cards")

// 	ctx := context.Background()

// 	aq := arango.NewQuery( /* aql */ `
// 		FOR c IN @@collection
// 		RETURN c
// 	`)

// 	aq.AddBindVar("@collection", source)

// 	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
// 	if err != nil {
// 		log.Error().Err(err).Msgf("Error querying database")
// 		return err
// 	}

// 	defer cursor.Close()

// 	var importedCards []model.MTG_ImportedCard
// 	for cursor.HasMore() {
// 		var card model.MTG_ImportedCard
// 		_, err := cursor.ReadDocument(ctx, &card)
// 		if err != nil {
// 			log.Error().Err(err).Msgf("Error reading document")
// 			return err
// 		}
// 		importedCards = append(importedCards, card)
// 	}

// 	log.Info().Msgf("Read %v cards from database", len(importedCards))

// 	// Insert the data into the database
// 	var cards []model.MtgCard

// 	for _, card := range importedCards {
// 		c := model.MtgCard{
// 			ID:          card.ID,
// 			Name:        card.Name,
// 			ManaCost:    card.ManaCost,
// 			Cmc:         int(card.CMC),
// 			TypeLine:    card.TypeLine,
// 			Description: card.OracleText,
// 			Power:       card.Power,
// 			Toughness:   card.Toughness,
// 			Layout:      card.Layout,
// 			Loyalty:     card.Loyalty,
// 			Set:         card.Set,
// 			SetName:     card.SetName,
// 			FlavorText:  card.FlavorText,
// 			Rarity:      model.MtgRarity(strings.ToUpper(card.Rarity)),
// 			ReleasedAt:  card.ReleasedAt,
// 			ScryfallURL: card.ScryfallURL,
// 		}

// 		if card.ImageUris != nil {
// 			c.Image = &model.MtgImage{
// 				Small:      card.ImageUris.Small,
// 				Normal:     card.ImageUris.Normal,
// 				Large:      card.ImageUris.Large,
// 				Png:        card.ImageUris.PNG,
// 				ArtCrop:    card.ImageUris.ArtCrop,
// 				BorderCrop: card.ImageUris.BorderCrop,
// 			}
// 		}

// 		if card.Colors != nil {
// 			for _, color := range card.Colors {
// 				c.Colors = append(c.Colors, model.MtgColor(*color))
// 			}
// 		}

// 		for _, color := range card.ColorIdentity {
// 			c.ColorIdentity = append(c.ColorIdentity, model.MtgColor(color))
// 		}
// 		if len(card.ColorIdentity) == 0 {
// 			c.ColorIdentity = append(c.ColorIdentity, model.MtgColor("C"))
// 		}

// 		if card.ProducedMana != nil {
// 			for _, color := range card.ProducedMana {
// 				c.ProducedMana = append(c.ProducedMana, model.MtgColor(*color))
// 			}
// 		}

// 		c.Legalities = make(map[string]any)
// 		for format, legality := range card.Legalities {
// 			c.Legalities[format] = legality
// 		}

// 		if card.CardFaces != nil {
// 			for _, face := range card.CardFaces {
// 				f := model.MtgCardFace{
// 					FlavorText:  face.FlavorText,
// 					Loyalty:     face.Loyalty,
// 					Name:        face.Name,
// 					Description: *face.OracleText,
// 					Power:       face.Power,
// 					Toughness:   face.Toughness,
// 					TypeLine:    face.TypeLine,
// 					ManaCost:    face.ManaCost,
// 				}

// 				if face.ImageUris != nil {
// 					f.Image = &model.MtgImage{
// 						Small:      face.ImageUris.Small,
// 						Normal:     face.ImageUris.Normal,
// 						Large:      face.ImageUris.Large,
// 						Png:        face.ImageUris.PNG,
// 						ArtCrop:    face.ImageUris.ArtCrop,
// 						BorderCrop: face.ImageUris.BorderCrop,
// 					}
// 				}

// 				if face.Colors != nil {
// 					for _, color := range face.Colors {
// 						f.Colors = append(f.Colors, model.MtgColor(color))
// 					}
// 				}

// 				c.CardFaces = append(c.CardFaces, &f)
// 			}
// 		}

// 		cards = append(cards, c)
// 	}

// 	log.Info().Msgf("Unmarshalled %v cards", len(cards))

// 	aq = arango.NewQuery( /* aql */ `
// 		FOR c IN @cards
// 			UPSERT { _key: c._key }
// 			INSERT c
// 			UPDATE c
// 			IN @@collection
// 	`)

// 	aq.AddBindVar("cards", cards)
// 	aq.AddBindVar("@collection", target)

// 	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
// 	if err != nil {
// 		log.Error().Err(err).Msgf("Error inserting cards into database")
// 		return err
// 	}

// 	log.Info().Msgf("Inserted cards into database")
// 	return nil
// }

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

// saveGroupToFile handles sanitizing the filename and saving the group's card data to a JSON file.
func saveGroupToFile(groupName string, filteredGroupCards []scryfall.Card, targetDir string) (string, error) {
	// Sanitize filename (replace slashes, etc.)
	safeGroupName := SanitizeFilename(groupName)

	// Prepare the JSON data
	jsonData, err := json.MarshalIndent(filteredGroupCards, "", "  ")
	if err != nil {
		log.Error().Err(err).Str("groupName", groupName).Msg("Error marshalling filtered group for JSON saving")
		return "", err // Return error if JSON marshalling fails
	}

	// Write the JSON data to the file
	jsonFilePath := filepath.Join(targetDir, fmt.Sprintf("%s.json", safeGroupName)) // Use filepath.Join
	err = os.WriteFile(jsonFilePath, jsonData, 0644)
	if err != nil {
		log.Error().Err(err).Str("groupName", groupName).Str("filePath", jsonFilePath).Msg("Error writing filtered group JSON to file")
		return "", err // Return error if file writing fails
	}
	log.Debug().Str("groupName", groupName).Str("filePath", jsonFilePath).Msg("Group JSON saved successfully") // Optional: log success
	return jsonFilePath, nil                                                                                   // Return the path of the saved file and nil error
}

// filterGroupCards removes duplicate printings within the same set based on finishes.
// It prefers entries listing both nonfoil and foil, then entries with more finishes.
func filterGroupCards(cards []scryfall.Card) []scryfall.Card {
	if len(cards) <= 1 {
		return cards // No need to filter if 0 or 1 card
	}

	chosenCards := make(map[string]scryfall.Card)
	originalOrderMap := make(map[string]int) // Keep track of original order roughly

	for i, card := range cards {
		// Key by Set + CollectorNumber to identify printings within the same set
		key := fmt.Sprintf("%s_%s", card.Set, card.CollectorNumber)

		// Track original order
		if _, exists := originalOrderMap[key]; !exists {
			originalOrderMap[key] = i
		}

		existingCard, exists := chosenCards[key]

		if !exists {
			chosenCards[key] = card
		} else {
			// Compare based on finishes
			if isBetterPrinting(card, existingCard) {
				chosenCards[key] = card
			}
		}
	}

	// Convert map values back to slice, preserving original relative order
	keys := make([]string, 0, len(chosenCards))
	for k := range chosenCards {
		keys = append(keys, k)
	}

	// Sort keys based on original appearance order to maintain stability
	sort.SliceStable(keys, func(i, j int) bool {
		// Use index 0 as fallback if key somehow wasn't in originalOrderMap
		orderI, okI := originalOrderMap[keys[i]]
		if !okI {
			orderI = 0
		}
		orderJ, okJ := originalOrderMap[keys[j]]
		if !okJ {
			orderJ = 0
		}
		return orderI < orderJ
	})

	filteredList := make([]scryfall.Card, 0, len(keys))
	for _, k := range keys {
		filteredList = append(filteredList, chosenCards[k])
	}

	if len(filteredList) < len(cards) {
		// Use group name from the first card for logging, assuming all cards in the input slice belong to the same logical group
		groupName := "unknown_group"
		if len(cards) > 0 {
			groupName = cards[0].Name // Best guess for the group name
		}
		log.Info().Str("groupName", groupName).Int("originalCount", len(cards)).Int("filteredCount", len(filteredList)).Msg("Filtered card variants within the group.")
	}

	return filteredList
}

// containsFinish checks if a slice of finish strings contains a specific finish type.
func containsFinish(finishes []string, finishType string) bool {
	for _, f := range finishes {
		if f == finishType {
			return true
		}
	}
	return false
}

// isBetterPrinting decides if newCard is a preferred version over existingCard
// based on finishes for the same logical card within a set.
func isBetterPrinting(newCard, existingCard scryfall.Card) bool {
	newHasNonfoil := containsFinish(newCard.Finishes, "nonfoil")
	newHasFoil := containsFinish(newCard.Finishes, "foil")
	existingHasNonfoil := containsFinish(existingCard.Finishes, "nonfoil")
	existingHasFoil := containsFinish(existingCard.Finishes, "foil")

	// Priority 1: Keep the one with both nonfoil and foil if the other doesn't have both.
	if (newHasNonfoil && newHasFoil) && !(existingHasNonfoil && existingHasFoil) {
		return true // New card has both, existing doesn't. New is better.
	}
	if !(newHasNonfoil && newHasFoil) && (existingHasNonfoil && existingHasFoil) {
		return false // Existing card has both, new doesn't. Keep existing.
	}

	// Priority 2: If neither or both have the nonfoil+foil combo, prefer the one listing more finishes overall.
	if len(newCard.Finishes) > len(existingCard.Finishes) {
		return true
	}
	if len(newCard.Finishes) < len(existingCard.Finishes) {
		return false
	}

	// Tie-breaker: Keep the existing one if finish counts are equal.
	return false
}

// downloadImagesForGroup handles downloading images for a slice of cards to a specified directory.
func downloadImagesForGroup(groupCards []scryfall.Card, targetDir string) {
	log.Info().Int("cardCount", len(groupCards)).Msgf("Attempting to download images for group into %s", targetDir)
	imageExtension := ".jpg" // Assuming JPG format for 'normal' size

	for _, card := range groupCards {
		// Skip if no image sources available
		if card.ImageUris == nil && (card.CardFaces == nil || len(*card.CardFaces) == 0) {
			log.Warn().Str("cardName", card.Name).Str("set", card.Set).Msg("Card has no top-level image URI and no card faces, skipping image download.")
			continue
		}

		if card.CardFaces != nil && len(*card.CardFaces) > 0 {
			// Handle multi-faced cards
			faceDownloadCount := 0
			for i, face := range *card.CardFaces {
				if face.ImageUris != nil && face.ImageUris.Normal != "" {
					safeFaceName := SanitizeFilename(face.Name)
					// Include set code in filename for uniqueness across sets
					baseFilename := fmt.Sprintf("%s_%s", safeFaceName, card.Set)
					uniqueImagePath := FindUniqueFilePath(targetDir, baseFilename, imageExtension)
					err := DownloadImage(face.ImageUris.Normal, uniqueImagePath)
					if err != nil {
						log.Error().Err(err).Str("cardId", card.ID).Str("faceName", face.Name).Str("set", card.Set).Str("imageUrl", face.ImageUris.Normal).Msgf("Error downloading image for face %d", i+1)
					} else {
						faceDownloadCount++
						// log.Debug().Msgf("Downloaded image %s", uniqueImagePath)
					}
				} else {
					log.Debug().Str("cardId", card.ID).Str("faceName", face.Name).Str("set", card.Set).Msgf("Face %d missing normal image URI.", i+1)
				}
			}
			if faceDownloadCount > 0 {
				log.Info().Str("cardId", card.ID).Str("cardName", card.Name).Str("set", card.Set).Int("facesDownloaded", faceDownloadCount).Msg("Finished downloading face images for card.")
			}
		} else if card.ImageUris != nil && card.ImageUris.Normal != "" {
			// Handle single-faced cards
			safeCardName := SanitizeFilename(card.Name)
			baseFilename := fmt.Sprintf("%s_%s", safeCardName, card.Set)
			uniqueImagePath := FindUniqueFilePath(targetDir, baseFilename, imageExtension)
			err := DownloadImage(card.ImageUris.Normal, uniqueImagePath)
			if err != nil {
				log.Error().Err(err).Str("cardId", card.ID).Str("cardName", card.Name).Str("set", card.Set).Str("imageUrl", card.ImageUris.Normal).Msg("Error downloading image for card")
			} else {
				log.Info().Str("cardId", card.ID).Str("cardName", card.Name).Str("set", card.Set).Msg("Downloaded image for card.")
				// log.Debug().Msgf("Downloaded image %s", uniqueImagePath)
			}
		} else {
			// Should be caught by the initial check, log just in case.
			log.Warn().Str("cardId", card.ID).Str("cardName", card.Name).Str("set", card.Set).Msg("Card has no faces and no top-level normal image URI after initial check.")
		}
	} // End loop through cards in the group
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
