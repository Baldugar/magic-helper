package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateMTGDeck(ctx context.Context, input model.MtgCreateDeckInput) (*model.Response, error) {
	log.Info().Msg("CreateMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			name: @name,
		} INTO MTG_Decks
		RETURN NEW
	`)

	aq.AddBindVar("name", input.Name)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGDeck: Error inserting deck")
		errMsg := err.Error()
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	var deckDB model.MTGDeckDB
	defer cursor.Close()
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			log.Error().Err(err).Msgf("CreateMTGDeck: Error reading document")
			errMsg := err.Error()
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	log.Info().Msg("CreateMTGDeck: Inserted deck")

	deck := model.MtgDeckDashboard{
		ID: deckDB.ID,
	}

	log.Info().Msg("CreateMTGDeck: Finished")
	return &model.Response{
		Status:  true,
		Message: &deck.ID,
	}, nil
}

func DeleteMTGDeck(ctx context.Context, input model.MtgDeleteDeckInput) (*model.Response, error) {
	log.Info().Msg("DeleteMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		LET frontCardImageDelete = (
			FOR frontCardImageEdge IN MTG_Deck_Front_Card_Image
				FILTER frontCardImageEdge._from == CONCAT("MTG_Decks", "/", @deckID)
				REMOVE frontCardImageEdge IN MTG_Deck_Front_Card_Image
		)
		
		LET cardDeckDelete = (
			FOR cardDeckEdge IN MTG_Card_Deck
				FILTER cardDeckEdge._to == CONCAT("MTG_Decks", "/", @deckID)
				REMOVE cardDeckEdge IN MTG_Card_Deck
		)

		LET docDelete = (
			FOR doc IN MTG_Decks
				FILTER doc._key == @deckID
				REMOVE doc IN MTG_Decks
				RETURN OLD
		)

		RETURN docDelete
	`)

	aq.AddBindVar("deckID", input.DeckID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("DeleteMTGDeck: Error deleting deck")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	log.Info().Msg("DeleteMTGDeck: Finished")
	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func UpdateMTGDeck(ctx context.Context, input model.MtgUpdateDeckInput) (*model.Response, error) {
	log.Info().Msg("UpdateMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		UPDATE @deckID WITH {
			name: @name,
			zones: @zones,
		} IN MTG_Decks
		RETURN NEW
	`)

	col := arango.MTG_DECKS_COLLECTION
	col2 := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("deckID", input.DeckID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("zones", input.Zones)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error updating deck")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	var deckDB model.MTGDeckDB
	defer cursor.Close()

	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &deckDB)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error reading document")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	// Remove all cards from the deck
	aq = arango.NewQuery( /* aql */ `
		FOR edge IN MTG_Card_Deck
			FILTER edge._to == CONCAT("MTG_Decks", "/", @deckID)
			REMOVE edge IN MTG_Card_Deck
	`)

	aq.AddBindVar("deckID", input.DeckID)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error removing cards from deck")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
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
			MainOrSide:        card.MainOrSide,
			DeckCardType:      card.DeckCardType,
			SelectedVersionID: card.SelectedVersionID,
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
			INSERT card INTO MTG_Card_Deck
	`)
	aq.AddBindVar("cards", allCards)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("UpdateMTGDeck: Error adding cards to deck")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	// Update the front card image
	if input.CardFrontImage == nil {
		// Remove the front card image
		aq = arango.NewQuery( /* aql */ `
			FOR edge IN MTG_Deck_Front_Card_Image
				FILTER edge._from == CONCAT("MTG_Decks", "/", @deckID)
				REMOVE edge IN MTG_Deck_Front_Card_Image
		`)
		aq.AddBindVar("deckID", input.DeckID)
		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error removing front card image")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	} else {
		aq = arango.NewQuery( /* aql */ `
			UPSERT { _from: @deckID }
				INSERT {
					_from: @deckID,
					_to: @imageID,
					versionID: @versionID
				}
				UPDATE {
					_to: @imageID,
					versionID: @versionID
				}
				IN MTG_Deck_Front_Card_Image
		`)

		aq.AddBindVar("deckID", col.String()+"/"+input.DeckID)
		aq.AddBindVar("imageID", col2.String()+"/"+input.CardFrontImage.CardID)
		aq.AddBindVar("versionID", input.CardFrontImage.VersionID)

		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msgf("UpdateMTGDeck: Error updating front card image")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	log.Info().Msg("UpdateMTGDeck: Finished")

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func SaveMTGDeckAsCopy(ctx context.Context, input model.MtgUpdateDeckInput) (*model.Response, error) {
	log.Info().Msg("SaveDeckAsCopy: Started")

	newName := input.Name + " (Copy)"

	createdDeck, err := CreateMTGDeck(ctx, model.MtgCreateDeckInput{
		Name: newName,
	})
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error creating deck")
		errMsg := err.Error()
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	deckID := *createdDeck.Message

	// Add all cards to the deck
	newInput := model.MtgUpdateDeckInput{
		DeckID:         deckID,
		Name:           newName,
		Zones:          input.Zones,
		CardFrontImage: input.CardFrontImage,
		Cards:          input.Cards,
	}

	_, err = UpdateMTGDeck(ctx, newInput)
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error updating deck")
		return nil, err
	}

	deck, err := GetMTGDeck(ctx, deckID)
	if err != nil {
		log.Error().Err(err).Msgf("SaveDeckAsCopy: Error getting deck")
		return nil, err
	}

	log.Info().Msg("SaveDeckAsCopy: Finished")
	return &model.Response{
		Status:  true,
		Message: &deck.ID,
	}, nil
}

func AddIgnoredCard(ctx context.Context, input model.AddIgnoredCardInput) (*model.Response, error) {
	log.Info().Msg("AddIgnoredCard: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			_from: CONCAT("MTG_Decks", "/", @deckID),
			_to: CONCAT("MTG_Cards", "/", @cardID),
		} INTO MTG_Deck_Ignore_Card
		RETURN NEW
	`)

	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("deckID", input.DeckID)

	log.Info().Str("query", aq.Query).Msg("AddIgnoredCard: Querying database")

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("AddIgnoredCard: Error querying database")
		return nil, err
	}

	log.Info().Msg("AddIgnoredCard: Finished")
	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func RemoveIgnoredCard(ctx context.Context, input model.RemoveIgnoredCardInput) (*model.Response, error) {
	log.Info().Msg("RemoveIgnoredCard: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR card, edge IN 1..1 OUTBOUND CONCAT("MTG_Decks", "/", @deckID) MTG_Deck_Ignore_Card
		FILTER edge._to == CONCAT("MTG_Cards", "/", @cardID)
		REMOVE edge IN MTG_Deck_Ignore_Card
	`)

	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("deckID", input.DeckID)

	log.Info().Str("query", aq.Query).Msg("RemoveIgnoredCard: Querying database")

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("RemoveIgnoredCard: Error querying database")
		return nil, err
	}

	log.Info().Msg("RemoveIgnoredCard: Finished")
	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}
