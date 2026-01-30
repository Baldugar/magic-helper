package daemons

import (
	"context"
	"encoding/json"
	"fmt"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

// shouldDownloadStart returns whether a new fetch cycle should begin for a record
// based on ApplicationConfig's LastTimeFetched; creates the record when missing.
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

// updateLastTimeFetched updates ApplicationConfig's LastTimeFetched for a record.
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

// createScryfallRequest builds a basic GET request for Scryfall with headers.
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

// parseCardsFromRaw converts raw JSON items into generic card maps for upsert.
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

// upsertOriginalCards upserts the provided card maps into mtg_original_cards.
func upsertOriginalCards(ctx context.Context, cards []map[string]any) error {
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c.id }
			INSERT MERGE({ _key: c.id }, c)
			UPDATE c
			IN mtg_original_cards
	`)

	aq.AddBindVar("cards", cards)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return err
	}

	return nil
}

// createScryfallRequestWithContext builds a GET request bound to the given context.
func createScryfallRequestWithContext(ctx context.Context, url string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return req, nil
}

// fetchURLWithContext performs an HTTP GET with context and ensures 200 OK.
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

// SanitizeFilename replaces filesystem-invalid characters for safer filenames.
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
