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
	"strings"

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

		log.Info().Msgf("Last time fetched: %v", appConfig.LastTimeFetched)

		// If we fetched sets in the last 24 hours, don't fetch again
		if util.Now() < appConfig.LastTimeFetched+24*60*60*1000 {
			log.Info().Msg("Already fetched sets in the last 24 hours")
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

func updateDatabaseCards(source arango.ArangoDocument, target arango.ArangoDocument) error {
	log.Info().Msg("Updating database cards")

	ctx := context.Background()

	aq := arango.NewQuery( /* aql */ `
		FOR c IN @@collection
		RETURN c
	`)

	aq.AddBindVar("@collection", source)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying database")
		return err
	}

	defer cursor.Close()

	var importedCards []model.MTG_ImportedCard
	for cursor.HasMore() {
		var card model.MTG_ImportedCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return err
		}
		importedCards = append(importedCards, card)
	}

	log.Info().Msgf("Read %v cards from database", len(importedCards))

	// Insert the data into the database
	var cards []model.MtgCard

	for _, card := range importedCards {
		c := model.MtgCard{
			ID:          card.ID,
			Name:        card.Name,
			ManaCost:    card.ManaCost,
			Cmc:         int(card.CMC),
			TypeLine:    card.TypeLine,
			Description: card.OracleText,
			Power:       card.Power,
			Toughness:   card.Toughness,
			Layout:      card.Layout,
			Loyalty:     card.Loyalty,
			Set:         card.Set,
			SetName:     card.SetName,
			FlavorText:  card.FlavorText,
			Rarity:      model.MtgRarity(strings.ToUpper(card.Rarity)),
			ReleasedAt:  card.ReleasedAt,
			ScryfallURL: card.ScryfallURL,
		}

		if card.ImageUris != nil {
			c.Image = &model.MtgImage{
				Small:      card.ImageUris.Small,
				Normal:     card.ImageUris.Normal,
				Large:      card.ImageUris.Large,
				Png:        card.ImageUris.PNG,
				ArtCrop:    card.ImageUris.ArtCrop,
				BorderCrop: card.ImageUris.BorderCrop,
			}
		}

		if card.Colors != nil {
			for _, color := range card.Colors {
				c.Colors = append(c.Colors, model.MtgColor(*color))
			}
		}

		for _, color := range card.ColorIdentity {
			c.ColorIdentity = append(c.ColorIdentity, model.MtgColor(color))
		}
		if len(card.ColorIdentity) == 0 {
			c.ColorIdentity = append(c.ColorIdentity, model.MtgColor("C"))
		}

		if card.ProducedMana != nil {
			for _, color := range card.ProducedMana {
				c.ProducedMana = append(c.ProducedMana, model.MtgColor(*color))
			}
		}

		c.Legalities = make(map[string]any)
		for format, legality := range card.Legalities {
			c.Legalities[format] = legality
		}

		if card.CardFaces != nil {
			for _, face := range card.CardFaces {
				f := model.MtgCardFace{
					FlavorText:  face.FlavorText,
					Loyalty:     face.Loyalty,
					Name:        face.Name,
					Description: *face.OracleText,
					Power:       face.Power,
					Toughness:   face.Toughness,
					TypeLine:    face.TypeLine,
					ManaCost:    face.ManaCost,
				}

				if face.ImageUris != nil {
					f.Image = &model.MtgImage{
						Small:      face.ImageUris.Small,
						Normal:     face.ImageUris.Normal,
						Large:      face.ImageUris.Large,
						Png:        face.ImageUris.PNG,
						ArtCrop:    face.ImageUris.ArtCrop,
						BorderCrop: face.ImageUris.BorderCrop,
					}
				}

				if face.Colors != nil {
					for _, color := range face.Colors {
						f.Colors = append(f.Colors, model.MtgColor(*color))
					}
				}

				if face.ProducedMana != nil {
					for _, color := range face.ProducedMana {
						f.ProducedMana = append(f.ProducedMana, model.MtgColor(*color))
					}
				}

				c.CardFaces = append(c.CardFaces, &f)
			}
		}

		cards = append(cards, c)
	}

	log.Info().Msgf("Unmarshalled %v cards", len(cards))

	aq = arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c._key }
			INSERT c
			UPDATE c
			IN @@collection
	`)

	aq.AddBindVar("cards", cards)
	aq.AddBindVar("@collection", target)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return err
	}

	log.Info().Msgf("Inserted cards into database")
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
