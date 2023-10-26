package daemons

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

type CardResponse struct {
	Data     []json.RawMessage `json:"data"`
	HasMore  bool              `json:"has_more"`
	NextPage string            `json:"next_page"`
}

func PeriodicFetchCards() {
	log.Info().Msg("Starting periodic fetch cards daemon")
	for {
		fetchCards()
		time.Sleep(24 * time.Hour)
	}
}

func fetchCards() {
	log.Info().Msg("Fetching cards from Scryfall")
	url := "https://api.scryfall.com/cards/search?q=game%3Aarena"

	var allCards []json.RawMessage

	i := 1
	for {
		// Fetch the data from the API
		resp, err := http.Get(url)
		if err != nil {
			log.Error().Err(err).Msgf("Error fetching cards from Scryfall")
			return
		}

		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Error fetching cards from Scryfall: %v", resp.Status)
			return
		}

		body, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Error().Err(err).Msgf("Error reading response body")
			return
		}

		// Unmarshal the JSON
		var response CardResponse
		err = json.Unmarshal(body, &response)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling response body")
			return
		}

		allCards = append(allCards, response.Data...)

		if !response.HasMore {
			break
		}

		log.Info().Msgf("Fetched page %v", i)
		i++
		url = response.NextPage
	}

	log.Info().Msgf("Fetched %v cards", len(allCards))

	cards := []model.MTGACard{}
	for _, card := range allCards {
		var cardMap model.MTGACard
		err := json.Unmarshal(card, &cardMap)
		if err != nil {
			log.Error().Err(err).Str("card", string(card)).Msgf("Error unmarshalling card")
			return
		}
		cards = append(cards, cardMap)
	}

	log.Info().Msgf("Unmarshalled %v cards", len(cards))
	log.Info().Msgf("Inserting cards into database")

	// Insert the data into the database
	ctx := context.Background()
	cardsCollection, err := arango.EnsureDocumentCollection(ctx, arango.CARDS_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting cards into database")
		return
	}
	for _, card := range cards {
		// Check if the card already exists
		exists, err := cardsCollection.DocumentExists(ctx, card.ID)
		if err != nil {
			log.Error().Err(err).Msgf("Error checking if card exists")
			return
		}
		if exists {
			continue
		}
		// Create a variable interface to hold the card, _key should have the id value
		cardInterface := map[string]interface{}{}
		// Marshal the card into the interface
		cardBytes, err := json.Marshal(card)
		if err != nil {
			log.Error().Err(err).Msgf("Error marshalling card")
			return
		}
		err = json.Unmarshal(cardBytes, &cardInterface)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling card")
			return
		}
		cardInterface["_key"] = card.ID
		// Insert the card
		_, err = cardsCollection.CreateDocument(ctx, cardInterface)
		if err != nil {
			log.Error().Err(err).Msgf("Error inserting card into database")
			return
		}
	}

	log.Info().Msgf("Inserted cards into database")
	log.Info().Msgf("Done")
}
