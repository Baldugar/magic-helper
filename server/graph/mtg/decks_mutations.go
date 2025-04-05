package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateMTGDeck(ctx context.Context, input model.MtgCreateDeckInput) (*model.MtgDeck, error) {
	log.Info().Msg("CreateMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			name: @name,
			type: @type,
		} INTO @@collection
		RETURN NEW
	`)

	col := arango.MTG_DECKS_COLLECTION
	if input.List == model.MtgCardListTypeMtga {
		col = arango.MTGA_DECKS_COLLECTION
	}

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("type", input.Type)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGDeck: Error inserting deck")
		return nil, err
	}

	var deckDB model.MTGDeckDB
	defer cursor.Close()
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			log.Error().Err(err).Msgf("CreateMTGDeck: Error reading document")
			return nil, err
		}
	}

	log.Info().Msg("CreateMTGDeck: Inserted deck")

	deck := model.MtgDeck{
		ID:             deckDB.ID,
		Name:           deckDB.Name,
		CardFrontImage: nil,
		Cards:          []*model.MtgDeckCard{},
		Zones:          []*model.FlowZone{},
		Type:           deckDB.Type,
	}

	log.Info().Msg("CreateMTGDeck: Finished")
	return &deck, nil
}

func DeleteMTGDeck(ctx context.Context, input model.MtgDeleteDeckInput) (bool, error) {
	log.Info().Msg("DeleteMTGDeck: Started")

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

	col := arango.MTG_DECKS_COLLECTION
	if input.List == model.MtgCardListTypeMtga {
		col = arango.MTGA_DECKS_COLLECTION
	}

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("collection", col)
	aq.AddBindVar("@edge", arango.MTG_DECK_FRONT_CARD_IMAGE_EDGE)
	aq.AddBindVar("@edge2", arango.MTG_CARD_DECK_EDGE)

	aq.AddBindVar("deckID", input.DeckID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("DeleteMTGDeck: Error deleting deck")
		return false, err
	}

	log.Info().Msg("DeleteMTGDeck: Finished")
	return false, nil
}

func UpdateMTGDeck(ctx context.Context, input model.MtgUpdateDeckInput) (*model.MtgDeck, error) {
	log.Info().Msg("UpdateMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		UPDATE @deckID WITH {
			name: @name,
			type: @type,
			zones: @zones,
			type: @type,
			ignoredCards: @ignoredCards
		} IN @@collection
		RETURN NEW
	`)

	col := arango.MTG_DECKS_COLLECTION
	col2 := arango.MTG_CARDS_COLLECTION
	if input.List == model.MtgCardListTypeMtga {
		col = arango.MTGA_DECKS_COLLECTION
		col2 = arango.MTGA_CARDS_COLLECTION
	}

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("deckID", input.DeckID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("type", input.Type)
	aq.AddBindVar("zones", input.Zones)
	aq.AddBindVar("ignoredCards", input.IgnoredCards)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error updating deck")
		return nil, err
	}

	var deckDB model.MTGDeckDB
	defer cursor.Close()

	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error reading document")
			return nil, err
		}
	}

	// Remove all cards from the deck
	aq = arango.NewQuery( /* aql */ `
		FOR edge IN @@edge
			FILTER edge._to == CONCAT(@collection, "/", @deckID)
			REMOVE edge IN @@edge
	`)

	aq.AddBindVar("collection", col)
	aq.AddBindVar("@edge", arango.MTG_CARD_DECK_EDGE)
	aq.AddBindVar("deckID", input.DeckID)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error removing cards from deck")
		return nil, err
	}

	// Add all cards to the deck
	allCards := []*model.MTGCardDeckDB{}
	for _, card := range input.Cards {
		newCard := &model.MTGCardDeckDB{
			From:  col2.String() + "/" + card.Card,
			To:    col.String() + "/" + input.DeckID,
			Count: card.Count,
			Position: model.Position{
				X: card.Position.X,
				Y: card.Position.Y,
			},
			MainOrSide:   card.MainOrSide,
			DeckCardType: card.DeckCardType,
		}

		for _, phantom := range card.Phantoms {
			newCard.Phantoms = append(newCard.Phantoms, model.Phantom{
				ID: phantom.ID,
				Position: &model.Position{
					X: phantom.Position.X,
					Y: phantom.Position.Y,
				},
			})
		}

		allCards = append(allCards, newCard)
	}

	aq = arango.NewQuery( /* aql */ `
		FOR card IN @cards
			INSERT card INTO @@edge
	`)
	aq.AddBindVar("@edge", arango.MTG_CARD_DECK_EDGE)
	aq.AddBindVar("cards", allCards)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error adding cards to deck")
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
		aq.AddBindVar("collection", col)
		aq.AddBindVar("@edge", arango.MTG_DECK_FRONT_CARD_IMAGE_EDGE)
		aq.AddBindVar("deckID", input.DeckID)
		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error removing front card image")
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
		aq.AddBindVar("@edge", arango.MTG_DECK_FRONT_CARD_IMAGE_EDGE)
		aq.AddBindVar("deckID", col.String()+"/"+input.DeckID)
		aq.AddBindVar("imageID", col2.String()+"/"+*input.CardFrontImage)

		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error updating front card image")
			return nil, err
		}
	}

	log.Info().Msg("UpdateMTGDeck: Finished")

	deck, err := GetMTGDecks(ctx, input.List, &input.DeckID)
	if err != nil {
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error getting deck")
		return nil, err
	}

	return deck[0], nil
}

func SaveMTGDeckAsCopy(ctx context.Context, input model.MtgUpdateDeckInput) (*model.MtgDeck, error) {
	log.Info().Msg("SaveDeckAsCopy: Started")

	newName := input.Name + " (Copy)"

	createdDeck, err := CreateMTGDeck(ctx, model.MtgCreateDeckInput{
		Name: newName,
		List: input.List,
		Type: input.Type,
	})
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error creating deck")
		return nil, err
	}

	// Add all cards to the deck
	newInput := model.MtgUpdateDeckInput{
		DeckID:         createdDeck.ID,
		Name:           newName,
		Type:           input.Type,
		Zones:          input.Zones,
		CardFrontImage: input.CardFrontImage,
		Cards:          input.Cards,
		IgnoredCards:   input.IgnoredCards,
		List:           input.List,
	}

	newDeck, err := UpdateMTGDeck(ctx, newInput)
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error updating deck")
		return nil, err
	}

	log.Info().Msg("SaveDeckAsCopy: Finished")
	return newDeck, nil
}
