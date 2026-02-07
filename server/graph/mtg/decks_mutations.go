package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// CreateMTGDeck inserts a new deck and returns its ID.
func CreateMTGDeck(ctx context.Context, input model.MtgCreateDeckInput) (*model.Response, error) {
	log.Info().Msg("CreateMTGDeck: Started")

	col, err := arango.EnsureDocumentCollection(ctx, arango.MTG_DECKS_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGDeck: Error ensuring document collection")
		return nil, err
	}

	exists, err := col.DocumentExists(ctx, input.Name)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGDeck: Error checking if document exists")
		return nil, err
	}
	if exists {
		log.Error().Msgf("CreateMTGDeck: Deck already exists")
		err := "Deck already exists"
		return &model.Response{
			Status:  false,
			Message: &err,
		}, nil
	}

	deckDB := model.MTGDeckDB{
		ID:   nil,
		Name: input.Name,
		Type: input.Type,
	}
	meta, err := col.CreateDocument(ctx, deckDB)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGDeck: Error creating document")
		return nil, err
	}

	log.Info().Msg("CreateMTGDeck: Finished")
	return &model.Response{
		Status:  true,
		Message: &meta.Key,
	}, nil
}

// DeleteMTGDeck deletes a deck and associated edges.
func DeleteMTGDeck(ctx context.Context, input model.MtgDeleteDeckInput) (*model.Response, error) {
	log.Info().Msg("DeleteMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		LET frontCardImageDelete = (
			FOR frontCardImageEdge IN mtg_deck_front_image
				FILTER frontCardImageEdge._from == CONCAT("mtg_decks", "/", @deckID)
				REMOVE frontCardImageEdge IN mtg_deck_front_image
		)
		
		LET cardDeckDelete = (
			FOR cardDeckEdge IN mtg_card_deck
				FILTER cardDeckEdge._to == CONCAT("mtg_decks", "/", @deckID)
				REMOVE cardDeckEdge IN mtg_card_deck
		)

		LET ignoredCardsDelete = (
			FOR ignoredCardEdge IN mtg_deck_ignore_card
				FILTER ignoredCardEdge._to == CONCAT("mtg_decks", "/", @deckID)
				REMOVE ignoredCardEdge IN mtg_deck_ignore_card
		)

		Let filterPresetsDelete = (
			FOR filterPresetEdge IN mtg_filter_preset_for_deck
				FILTER filterPresetEdge._to == CONCAT("mtg_decks", "/", @deckID)
				REMOVE filterPresetEdge IN mtg_filter_preset_for_deck
		)

		LET docDelete = (
			FOR doc IN mtg_decks
				FILTER doc._key == @deckID
				REMOVE doc IN mtg_decks
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

// UpdateMTGDeck replaces deck fields and rewrites card edges and front image.
func UpdateMTGDeck(ctx context.Context, input model.MtgUpdateDeckInput) (*model.Response, error) {
	log.Info().Msg("UpdateMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		UPDATE @deckID WITH {
			name: @name,
			type: @type,
			zones: @zones,
			autosave: @autosave,
		} IN mtg_decks
		RETURN NEW
	`)

	col := arango.MTG_DECKS_COLLECTION
	col2 := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("deckID", input.DeckID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("type", input.Type)
	aq.AddBindVar("zones", input.Zones)
	aq.AddBindVar("autosave", input.Autosave)

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

	// TODO: REFACTOR THIS SO IT DOESN'T DELETE AND ADD ALL CARDS AGAIN
	// Remove all cards from the deck
	aq = arango.NewQuery( /* aql */ `
		FOR edge IN mtg_card_deck
			FILTER edge._to == CONCAT("mtg_decks", "/", @deckID)
			REMOVE edge IN mtg_card_deck
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
			INSERT card INTO mtg_card_deck
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
			FOR edge IN mtg_deck_front_image
				FILTER edge._from == CONCAT("mtg_decks", "/", @deckID)
				REMOVE edge IN mtg_deck_front_image
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
				IN mtg_deck_front_image
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

// SaveMTGDeckAsCopy creates a new deck with copied data from the input deck.
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

	log.Info().Msg("SaveDeckAsCopy: Finished")
	return &model.Response{
		Status:  true,
		Message: &deckID,
	}, nil
}

// AddIgnoredCard marks a card as ignored for a given deck.
func AddIgnoredCard(ctx context.Context, input model.AddIgnoredCardInput) (*model.Response, error) {
	log.Info().Msg("AddIgnoredCard: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			_from: CONCAT("mtg_decks", "/", @deckID),
			_to: CONCAT("mtg_cards", "/", @cardID),
		} INTO mtg_deck_ignore_card
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

// RemoveIgnoredCard unmarks an ignored card for a given deck.
func RemoveIgnoredCard(ctx context.Context, input model.RemoveIgnoredCardInput) (*model.Response, error) {
	log.Info().Msg("RemoveIgnoredCard: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR card, edge IN 1..1 OUTBOUND CONCAT("mtg_decks", "/", @deckID) mtg_deck_ignore_card
		FILTER edge._to == CONCAT("mtg_cards", "/", @cardID)
		REMOVE edge IN mtg_deck_ignore_card
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
