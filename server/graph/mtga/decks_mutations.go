package mtga

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateMTGADeck(ctx context.Context, input model.MtgaCreateDeckInput) (*model.MtgaDeck, error) {
	log.Info().Msg("CreateMTGADeck: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			name: @name,
			type: @type,
		} INTO @@collection
		RETURN NEW
	`)
	aq.AddBindVar("@collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("type", input.Type)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGADeck: Error inserting deck")
		return nil, err
	}

	var deckDB model.MTGADeckDB
	defer cursor.Close()
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			log.Error().Err(err).Msgf("CreateMTGADeck: Error reading document")
			return nil, err
		}
	}

	log.Info().Msg("CreateMTGADeck: Inserted deck")

	deck := model.MtgaDeck{
		ID:             deckDB.ID,
		Name:           deckDB.Name,
		CardFrontImage: nil,
		Cards:          []*model.MtgaDeckCard{},
		Zones:          []*model.FlowZone{},
		Type:           deckDB.Type,
	}

	log.Info().Msg("CreateMTGADeck: Finished")
	return &deck, nil
}

func DeleteMTGADeck(ctx context.Context, input model.MtgaDeleteDeckInput) (bool, error) {
	log.Info().Msg("DeleteMTGADeck: Started")

	aq := arango.NewQuery( /* aql */ `

		LET frontCardImageDelete = (
			FOR frontCardImageEdge IN @@edge
				FILTER frontCardImageEdge._from == CONCAT(@collection, "/", @deckID)
				REMOVE frontCardImageEdge IN @@edge
		)
		
		LET cardDeckDelete = (
			FOR cardDeckEdge IN @@edge2
				FILTER cardDeckEdge._to == CONCAT(@collection, "/", @deckID)
				REMOVE cardDeckEdge IN @@edge2
		)

		LET docDelete = (
			FOR doc IN @@collection
				FILTER doc._key == @deckID
				REMOVE doc IN @@collection
				RETURN OLD
		)

		RETURN docDelete
	`)
	aq.AddBindVar("@collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("@edge", arango.MTGA_DECK_FRONT_CARD_IMAGE_EDGE)
	aq.AddBindVar("@edge2", arango.MTGA_CARD_DECK_EDGE)

	aq.AddBindVar("deckID", input.DeckID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("DeleteMTGADeck: Error deleting deck")
		return false, err
	}

	log.Info().Msg("DeleteMTGADeck: Finished")
	return false, nil
}

func UpdateMTGADeck(ctx context.Context, input model.MtgaUpdateDeckInput) (*model.MtgaDeck, error) {
	log.Info().Msg("UpdateMTGADeck: Started")

	aq := arango.NewQuery( /* aql */ `
		UPDATE @deckID WITH {
			name: @name,
			type: @type,
			zones: @zones,
			type: @type
		} IN @@collection
		RETURN NEW
	`)

	aq.AddBindVar("@collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("deckID", input.DeckID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("type", input.Type)
	aq.AddBindVar("zones", input.Zones)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGADeck: Error updating deck")
		return nil, err
	}

	var deckDB model.MTGADeckDB
	defer cursor.Close()

	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGADeck: Error reading document")
			return nil, err
		}
	}

	// Remove all cards from the deck
	aq = arango.NewQuery( /* aql */ `
		FOR edge IN @@edge
			FILTER edge._to == CONCAT(@collection, "/", @deckID)
			REMOVE edge IN @@edge
	`)

	aq.AddBindVar("collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("@edge", arango.MTGA_CARD_DECK_EDGE)
	aq.AddBindVar("deckID", input.DeckID)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGADeck: Error removing cards from deck")
		return nil, err
	}

	// Add all cards to the deck
	allCards := []*model.MTGACardDeckDB{}
	for _, card := range input.Cards {
		newCard := &model.MTGACardDeckDB{
			From:  arango.MTGA_CARDS_COLLECTION.String() + "/" + card.Card,
			To:    arango.MTGA_DECKS_COLLECTION.String() + "/" + input.DeckID,
			Count: card.Count,
			Position: model.Position{
				X: card.Position.X,
				Y: card.Position.Y,
			},
			MainOrSide:   card.MainOrSide,
			DeckCardType: card.DeckCardType,
		}

		for _, phantom := range card.Phantoms {
			newCard.Phantoms = append(newCard.Phantoms, model.Position{
				X: phantom.X,
				Y: phantom.Y,
			})
		}

		allCards = append(allCards, newCard)
	}

	aq = arango.NewQuery( /* aql */ `
		FOR card IN @cards
			INSERT card INTO @@edge
	`)
	aq.AddBindVar("@edge", arango.MTGA_CARD_DECK_EDGE)
	aq.AddBindVar("cards", allCards)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGADeck: Error adding cards to deck")
		return nil, err
	}

	// Update the front card image
	if input.CardFrontImage == nil {
		// Remove the front card image
		aq = arango.NewQuery( /* aql */ `
			FOR edge IN @@edge
				FILTER edge._from == CONCAT(@collection, "/", @deckID)
				REMOVE edge IN @@edge
		`)
		aq.AddBindVar("collection", arango.MTGA_DECKS_COLLECTION)
		aq.AddBindVar("@edge", arango.MTGA_DECK_FRONT_CARD_IMAGE_EDGE)
		aq.AddBindVar("deckID", input.DeckID)
		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGADeck: Error removing front card image")
			return nil, err
		}
	} else {
		aq = arango.NewQuery( /* aql */ `
		UPSERT { _from: @deckID }
			INSERT {
				_from: @deckID,
				_to: @imageID
			}
			UPDATE {
				_to: @imageID
			}
			IN @@edge
	`)
		aq.AddBindVar("@edge", arango.MTGA_DECK_FRONT_CARD_IMAGE_EDGE)
		aq.AddBindVar("deckID", arango.MTGA_DECKS_COLLECTION.String()+"/"+input.DeckID)
		aq.AddBindVar("imageID", arango.MTGA_CARDS_COLLECTION.String()+"/"+*input.CardFrontImage)

		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGADeck: Error updating front card image")
			return nil, err
		}
	}

	log.Info().Msg("UpdateMTGADeck: Finished")

	deck, err := GetMTGADecks(ctx, &input.DeckID)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGADeck: Error getting deck")
		return nil, err
	}

	return deck[0], nil
}

func SaveMTGADeckAsCopy(ctx context.Context, input model.MtgaUpdateDeckInput) (*model.MtgaDeck, error) {
	log.Info().Msg("SaveDeckAsCopy: Started")

	newName := input.Name + " (Copy)"

	createdDeck, err := CreateMTGADeck(ctx, model.MtgaCreateDeckInput{
		Name: newName,
		Type: input.Type,
	})
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error creating deck")
		return nil, err
	}

	// Add all cards to the deck
	newInput := model.MtgaUpdateDeckInput{
		DeckID:         createdDeck.ID,
		Name:           newName,
		Type:           input.Type,
		Zones:          input.Zones,
		CardFrontImage: input.CardFrontImage,
		Cards:          input.Cards,
	}

	newDeck, err := UpdateMTGADeck(ctx, newInput)
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error updating deck")
		return nil, err
	}

	log.Info().Msg("SaveDeckAsCopy: Finished")
	return newDeck, nil
}
