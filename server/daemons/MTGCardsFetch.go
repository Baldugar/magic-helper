package daemons

import (
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"time"

	"github.com/rs/zerolog/log"
)

type ScryfallResponse struct {
	Data     []json.RawMessage `json:"data"`
	HasMore  bool              `json:"has_more"`
	NextPage string            `json:"next_page"`
}

func PeriodicFetchMTGCards() {
	log.Info().Msg("Starting periodic fetch cards daemon")
	for {
		fetched := fetchMTGCards()
		if fetched {
			err := updateDatabaseCards(arango.MTG_ORIGINAL_CARDS_COLLECTION, arango.MTG_CARDS_COLLECTION)
			if err != nil {
				log.Error().Err(err).Msgf("Error updating database cards")
			}

			err = updateDatabaseCards(arango.MTGA_ORIGINAL_CARDS_COLLECTION, arango.MTGA_CARDS_COLLECTION)
			if err != nil {
				log.Error().Err(err).Msgf("Error updating database cards")
			}
		}
		time.Sleep(24 * time.Hour)
	}
}

func fetchMTGCards() bool {
	log.Info().Msg("Fetching cards from Scryfall")
	url := "https://api.scryfall.com/bulk-data"

	// Check if we should fetch cards
	shouldFetch, err := shouldDownloadStart("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch cards")
		return false
	}

	if !shouldFetch {
		return false
	}

	// Fetch the data from the API
	ctx := context.Background()
	resp, err := fetchURLWithContext(ctx, url)
	if err != nil {
		log.Error().Err(err).Msg("Error fetching cards")
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading response body")
		return false
	}

	// Unmarshal the JSON
	var response ScryfallResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		log.Error().Err(err).Msgf("Error unmarshalling response body")
		return false
	}

	rawCollections := response.Data
	for _, collection := range rawCollections {
		var collectionMap map[string]any
		err := json.Unmarshal(collection, &collectionMap)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling collections")
			return false
		} else {
			if collectionType, ok := collectionMap["type"].(string); ok && collectionType == "unique_artwork" {
				resp, err := fetchURLWithContext(ctx, collectionMap["download_uri"].(string))
				if err != nil {
					log.Error().Err(err).Msg("Error fetching cards")
					return false
				}
				defer resp.Body.Close()

				log.Info().Msgf("Processing cards from %v", collectionMap["download_uri"].(string))

				// Multiple card processing
				var allCards []json.RawMessage
				err = json.NewDecoder(resp.Body).Decode(&allCards)
				if err != nil {
					log.Error().Err(err).Msg("Error decoding cards")
					return false
				}

				parsedArr, err := parseCardsFromRaw(allCards)
				if err != nil {
					log.Error().Err(err).Msg("Error parsing raw cards")
					return false
				}

				err = upsertOriginalCards(ctx, parsedArr, arango.MTG_ORIGINAL_CARDS_COLLECTION)
				if err != nil {
					log.Error().Err(err).Msg("Error processing raw cards")
					return false
				}

				arenaCards := []map[string]any{}
				for _, card := range parsedArr {
					isInArena := false
					for _, game := range card["games"].([]any) {
						if game == "arena" {
							isInArena = true
							break
						}
					}
					if isInArena {
						arenaCards = append(arenaCards, card)
					}
				}

				err = upsertOriginalCards(ctx, arenaCards, arango.MTGA_ORIGINAL_CARDS_COLLECTION)
				if err != nil {
					log.Error().Err(err).Msg("Error processing raw cards")
					return false
				}
			}
		}
	}

	// Update the last time we fetched cards
	err = updateLastTimeFetched("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		return false
	}

	log.Info().Msgf("Done")

	return true
}
