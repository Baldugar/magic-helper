package mtg

import (
	"context"
	"errors"
	"strings"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/mtgCardSearch"

	"github.com/rs/zerolog/log"
)

// CreateMTGTag inserts a new tag and returns it. Arango auto-generates _key. Name must be unique.
func CreateMTGTag(ctx context.Context, input model.MtgCreateTagInput) (*model.MtgTag, error) {
	log.Info().Msg("CreateMTGTag: Started")

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}

	// Handle meta field: default to false if nil
	meta := false
	if input.Meta != nil {
		meta = *input.Meta
	}

	check := arango.NewQuery( /* aql */ `
		FOR tag IN mtg_tags FILTER tag.name == @name LIMIT 1 RETURN tag
	`)
	check.AddBindVar("name", name)
	checkCursor, err := arango.DB.Query(ctx, check.Query, check.BindVars)
	if err != nil {
		return nil, err
	}
	if checkCursor.HasMore() {
		checkCursor.Close()
		return nil, errors.New("tag name already exists")
	}
	checkCursor.Close()

	aq := arango.NewQuery( /* aql */ `
		INSERT { name: @name, meta: @meta } INTO mtg_tags
		RETURN { _key: NEW._key, name: NEW.name, meta: NEW.meta }
	`)

	aq.AddBindVar("name", name)
	aq.AddBindVar("meta", meta)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("CreateMTGTag: Error inserting tag")
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		return nil, errors.New("CreateMTGTag: no document returned")
	}

	var tag model.MtgTag
	_, err = cursor.ReadDocument(ctx, &tag)
	if err != nil {
		log.Error().Err(err).Msg("CreateMTGTag: Error reading inserted document")
		return nil, err
	}

	log.Info().Str("tagID", tag.ID).Msg("CreateMTGTag: Finished")
	return &tag, nil
}

// UpdateMTGTag updates an existing tag by ID. Returns the updated tag or nil if not found.
func UpdateMTGTag(ctx context.Context, input model.MtgUpdateTagInput) (*model.MtgTag, error) {
	log.Info().Str("tagID", input.TagID).Msg("UpdateMTGTag: Started")

	tagID := strings.TrimSpace(input.TagID)
	if tagID == "" {
		return nil, errors.New("tagID is required")
	}

	updateFields := map[string]any{}
	if input.Name != nil {
		trimmed := strings.TrimSpace(*input.Name)
		if trimmed == "" {
			return nil, errors.New("name cannot be empty")
		}
		updateFields["name"] = trimmed
	}
	if input.Meta != nil {
		updateFields["meta"] = *input.Meta
	}
	if len(updateFields) == 0 {
		return GetMTGTag(ctx, tagID)
	}

	if updateFields["name"] != nil {
		check := arango.NewQuery( /* aql */ `
			FOR tag IN mtg_tags FILTER tag.name == @name AND tag._key != @tagID LIMIT 1 RETURN tag
		`)
		check.AddBindVar("name", updateFields["name"])
		check.AddBindVar("tagID", tagID)
		checkCursor, err := arango.DB.Query(ctx, check.Query, check.BindVars)
		if err != nil {
			return nil, err
		}
		if checkCursor.HasMore() {
			checkCursor.Close()
			return nil, errors.New("tag name already exists")
		}
		checkCursor.Close()
	}

	aq := arango.NewQuery( /* aql */ `
		UPDATE { _key: @tagID } WITH @updates IN mtg_tags
		RETURN { _key: NEW._key, name: NEW.name, meta: NEW.meta }
	`)

	aq.AddBindVar("tagID", tagID)
	aq.AddBindVar("updates", updateFields)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("UpdateMTGTag: Error updating tag")
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		return nil, nil
	}

	var tag model.MtgTag
	_, err = cursor.ReadDocument(ctx, &tag)
	if err != nil {
		log.Error().Err(err).Msg("UpdateMTGTag: Error reading updated document")
		return nil, err
	}

	log.Info().Msg("UpdateMTGTag: Finished")
	return &tag, nil
}

// DeleteMTGTag deletes a tag and all its edges (to decks and cards).
// Also removes the tag from any chains where it appears.
func DeleteMTGTag(ctx context.Context, input model.MtgDeleteTagInput) (*model.Response, error) {
	log.Info().Str("tagID", input.TagID).Msg("DeleteMTGTag: Started")

	tagID := strings.TrimSpace(input.TagID)
	if tagID == "" {
		return nil, errors.New("tagID is required")
	}

	// Sync card index: remove this tag from all cards in the index before deleting the tag.
	if mtgCardSearch.IsIndexReady() {
		mtgCardSearch.RemoveTagFromAllCardsInIndex(tagID)
	}

	// Step 1: Update edges where this tag appears in the chain array (remove from chain)
	// This must be a separate query because ArangoDB doesn't allow reading after modifying
	aqUpdateChains := arango.NewQuery( /* aql */ `
		FOR edge IN mtg_tag_to_card
			FILTER @tagID IN (edge.chain || [])
			LET newChain = (
				FOR chainTagID IN (edge.chain || [])
					FILTER chainTagID != @tagID
					RETURN chainTagID
			)
			UPDATE edge WITH { chain: newChain } IN mtg_tag_to_card
	`)
	aqUpdateChains.AddBindVar("tagID", tagID)

	_, err := arango.DB.Query(ctx, aqUpdateChains.Query, aqUpdateChains.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("DeleteMTGTag: Error updating chains")
		return nil, err
	}

	// Step 2: Remove edges where this tag is the terminal tag, deck edges, and the tag itself
	aqDelete := arango.NewQuery( /* aql */ `
		LET tagRef = CONCAT("mtg_tags", "/", @tagID)
		LET removeDeckEdges = (
			FOR edge IN mtg_tag_to_deck
				FILTER edge._from == tagRef
				REMOVE edge IN mtg_tag_to_deck
		)
		LET removeCardEdges = (
			FOR edge IN mtg_tag_to_card
				FILTER edge._from == tagRef
				REMOVE edge IN mtg_tag_to_card
		)
		LET docDelete = (
			FOR tag IN mtg_tags
				FILTER tag._key == @tagID
				REMOVE tag IN mtg_tags
				RETURN OLD
		)
		RETURN docDelete
	`)
	aqDelete.AddBindVar("tagID", tagID)

	_, err = arango.DB.Query(ctx, aqDelete.Query, aqDelete.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("DeleteMTGTag: Error deleting tag")
		return nil, err
	}

	log.Info().Msg("DeleteMTGTag: Finished")
	return &model.Response{Status: true}, nil
}

// AssignTagToCard creates an edge from the tag to the card with optional chain. Idempotent: no-op if edge with same chain already exists.
func AssignTagToCard(ctx context.Context, input model.MtgAssignTagToCardInput) (*model.Response, error) {
	log.Info().Str("tagID", input.TagID).Str("cardID", input.CardID).Msg("AssignTagToCard: Started")

	// Normalize nil chain to empty array
	chain := input.Chain
	if chain == nil {
		chain = []string{}
	}

	aq := arango.NewQuery( /* aql */ `
		LET fromRef = CONCAT("mtg_tags", "/", @tagID)
		LET toRef = CONCAT("mtg_cards", "/", @cardID)
		LET existing = (FOR e IN mtg_tag_to_card FILTER e._from == fromRef AND e._to == toRef AND e.chain == @chain LIMIT 1 RETURN 1)
		FILTER LENGTH(existing) == 0
		INSERT { _from: fromRef, _to: toRef, chain: @chain } INTO mtg_tag_to_card
		RETURN NEW
	`)

	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("chain", chain)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("AssignTagToCard: Error inserting edge")
		return nil, err
	}

	if mtgCardSearch.IsIndexReady() {
		if assignments, err := GetTagAssignmentsForCard(ctx, input.CardID); err == nil {
			mtgCardSearch.UpdateCardTagAssignmentsInIndex(input.CardID, assignments)
		}
	}

	log.Info().Msg("AssignTagToCard: Finished")
	return &model.Response{Status: true}, nil
}

// UnassignTagFromCard removes the edge from the tag to the card matching by tag ID, card ID AND chain array.
func UnassignTagFromCard(ctx context.Context, input model.MtgUnassignTagFromCardInput) (*model.Response, error) {
	log.Info().Str("tagID", input.TagID).Str("cardID", input.CardID).Msg("UnassignTagFromCard: Started")

	// Normalize nil chain to empty array for matching
	chain := input.Chain
	if chain == nil {
		chain = []string{}
	}

	aq := arango.NewQuery( /* aql */ `
		FOR edge IN mtg_tag_to_card
			FILTER edge._from == CONCAT("mtg_tags", "/", @tagID)
			  AND edge._to == CONCAT("mtg_cards", "/", @cardID)
			  AND edge.chain == @chain
			REMOVE edge IN mtg_tag_to_card
	`)

	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("chain", chain)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("UnassignTagFromCard: Error removing edge")
		return nil, err
	}

	if mtgCardSearch.IsIndexReady() {
		if assignments, err := GetTagAssignmentsForCard(ctx, input.CardID); err == nil {
			mtgCardSearch.UpdateCardTagAssignmentsInIndex(input.CardID, assignments)
		}
	}

	log.Info().Msg("UnassignTagFromCard: Finished")
	return &model.Response{Status: true}, nil
}

// AssignTagToDeck creates an edge from the tag to the deck. Idempotent: no-op if edge already exists.
func AssignTagToDeck(ctx context.Context, input model.MtgAssignTagToDeckInput) (*model.Response, error) {
	log.Info().Str("tagID", input.TagID).Str("deckID", input.DeckID).Msg("AssignTagToDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		LET fromRef = CONCAT("mtg_tags", "/", @tagID)
		LET toRef = CONCAT("mtg_decks", "/", @deckID)
		LET existing = (FOR e IN mtg_tag_to_deck FILTER e._from == fromRef AND e._to == toRef LIMIT 1 RETURN 1)
		FILTER LENGTH(existing) == 0
		INSERT { _from: fromRef, _to: toRef } INTO mtg_tag_to_deck
		RETURN NEW
	`)

	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("deckID", input.DeckID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("AssignTagToDeck: Error inserting edge")
		return nil, err
	}

	log.Info().Msg("AssignTagToDeck: Finished")
	return &model.Response{Status: true}, nil
}

// UnassignTagFromDeck removes the edge from the tag to the deck.
func UnassignTagFromDeck(ctx context.Context, input model.MtgUnassignTagFromDeckInput) (*model.Response, error) {
	log.Info().Str("tagID", input.TagID).Str("deckID", input.DeckID).Msg("UnassignTagFromDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR edge IN mtg_tag_to_deck
			FILTER edge._from == CONCAT("mtg_tags", "/", @tagID)
			  AND edge._to == CONCAT("mtg_decks", "/", @deckID)
			REMOVE edge IN mtg_tag_to_deck
	`)

	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("deckID", input.DeckID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("UnassignTagFromDeck: Error removing edge")
		return nil, err
	}

	log.Info().Msg("UnassignTagFromDeck: Finished")
	return &model.Response{Status: true}, nil
}
