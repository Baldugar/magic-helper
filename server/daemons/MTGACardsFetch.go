package daemons

import (
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type ScryfallResponse struct {
	Data     []json.RawMessage `json:"data"`
	HasMore  bool              `json:"has_more"`
	NextPage string            `json:"next_page"`
}

func PeriodicFetchMTGACards() {
	log.Info().Msg("Starting periodic fetch cards daemon")
	for {
		fetched := fetchCards()
		if fetched {
			updateDatabaseCards()
		}
		time.Sleep(24 * time.Hour)
	}
}

func fetchCards() bool {
	log.Info().Msg("Fetching cards from Scryfall")
	url := "https://api.scryfall.com/cards/search?q=game%3Aarena"

	ctx := context.Background()

	// Check if we should fetch cards
	shouldFetch, err := shouldDownloadStart("MTGA_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch cards")
		return false
	}

	if !shouldFetch {
		return false
	}

	var allCards []json.RawMessage

	i := 1
	for {
		// Fetch the data from the API
		resp, err := http.Get(url)
		if err != nil {
			log.Error().Err(err).Msgf("Error fetching cards from Scryfall")
			return false
		}

		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Error fetching cards from Scryfall: %v", resp.Status)
			return false
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
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

		allCards = append(allCards, response.Data...)

		if !response.HasMore {
			break
		}

		log.Info().Msgf("Fetched page %v", i)
		i++
		url = response.NextPage
		time.Sleep(100 * time.Millisecond)
	}

	log.Info().Msgf("Fetched %v cards", len(allCards))

	cards := []map[string]interface{}{}
	for _, card := range allCards {
		var cardMap map[string]interface{}
		err := json.Unmarshal(card, &cardMap)
		if err != nil {
			log.Error().Err(err).Str("card", string(card)).Msgf("Error unmarshalling card")
			return false
		}
		cards = append(cards, cardMap)
	}

	log.Info().Msgf("Unmarshalled %v cards", len(cards))
	log.Info().Msgf("Inserting cards into database")

	// Insert the data into the database
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c.id }
			INSERT MERGE({ _key: c.id }, c)
			UPDATE c
			IN @@collection
	`)

	aq.AddBindVar("cards", cards)
	aq.AddBindVar("@collection", arango.MTGA_ORIGINAL_CARDS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return false
	}

	// Update the last time we fetched cards
	err = updateLastTimeFetched("MTGA_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		return false
	}

	log.Info().Msgf("Inserted cards into database")
	log.Info().Msgf("Done")

	return true
}

func updateDatabaseCards() {
	log.Info().Msg("Updating database cards")

	ctx := context.Background()

	aq := arango.NewQuery( /* aql */ `
		FOR c IN @@collection
		RETURN c
	`)

	aq.AddBindVar("@collection", arango.MTGA_ORIGINAL_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying database")
		return
	}

	defer cursor.Close()

	var importedCards []model.MTGA_ImportedCard
	for cursor.HasMore() {
		var card model.MTGA_ImportedCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return
		}
		importedCards = append(importedCards, card)
	}

	log.Info().Msgf("Read %v cards from database", len(importedCards))

	// Insert the data into the database
	var cards []model.MtgaCard

	for _, card := range importedCards {
		c := model.MtgaCard{
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
			Rarity:      model.MtgaRarity(strings.ToUpper(card.Rarity)),
			ReleasedAt:  card.ReleasedAt,
			ScryfallURL: card.ScryfallURL,
		}

		if card.ImageUris != nil {
			c.Image = &model.MtgaImage{
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
				c.Colors = append(c.Colors, model.MtgaColor(*color))
			}
		}

		for _, color := range card.ColorIdentity {
			c.ColorIdentity = append(c.ColorIdentity, model.MtgaColor(color))
		}
		if len(card.ColorIdentity) == 0 {
			c.ColorIdentity = append(c.ColorIdentity, model.MtgaColor("C"))
		}

		if card.ProducedMana != nil {
			for _, color := range card.ProducedMana {
				c.ProducedMana = append(c.ProducedMana, model.MtgaColor(*color))
			}
		}

		c.Legalities = make(map[string]interface{})
		for format, legality := range card.Legalities {
			c.Legalities[format] = legality
		}

		if card.CardFaces != nil {
			for _, face := range card.CardFaces {
				f := model.MtgaCardFace{
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
					f.Image = &model.MtgaImage{
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
						f.Colors = append(f.Colors, model.MtgaColor(*color))
					}
				}

				if face.ProducedMana != nil {
					for _, color := range face.ProducedMana {
						f.ProducedMana = append(f.ProducedMana, model.MtgaColor(*color))
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
	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return
	}

	log.Info().Msgf("Inserted cards into database")
}
