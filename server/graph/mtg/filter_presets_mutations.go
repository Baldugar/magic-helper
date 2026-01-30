package mtg

import (
	"context"
	"errors"
	"strings"
	"time"

	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

var (
	errFilterPresetUnauthorized = errors.New("unauthorized")
	errFilterPresetNotFound     = errors.New("filter preset not found")
)

// CreateMTGFilterPreset persists a new preset and links it to the target deck.
func CreateMTGFilterPreset(ctx context.Context, input model.MtgCreateFilterPresetInput) (*model.MtgFilterPreset, error) {
	log.Info().Str("deckID", input.DeckID).Msg("CreateMTGFilterPreset: Started")

	deckID := strings.TrimSpace(input.DeckID)
	if deckID == "" {
		return nil, errors.New("deckID is required")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}

	filterData := input.FilterState
	if filterData == nil {
		filterData = map[string]any{}
	}

	sortState := model.SortInputToState(input.SortState)
	if sortState == nil {
		sortState = []*model.MtgFilterSortState{}
	}

	savedAt := time.Now().UTC().Format(time.RFC3339)

	aq := arango.NewQuery( /* aql */ `
        INSERT {
            deckID: @deckID,
            name: @name,
            savedAt: @savedAt,
            filterState: @filterState,
            sortState: @sortState,
            page: @page
        } INTO mtg_filter_presets
        RETURN NEW
    `)

	aq.AddBindVar("deckID", deckID)
	aq.AddBindVar("name", name)
	aq.AddBindVar("savedAt", savedAt)
	aq.AddBindVar("filterState", filterData)
	aq.AddBindVar("sortState", sortState)
	aq.AddBindVar("page", input.Page)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("CreateMTGFilterPreset: Error inserting preset")
		return nil, err
	}
	defer cursor.Close()

	var presetDB model.MTGFilterPresetDB
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &presetDB)
		if err != nil {
			log.Error().Err(err).Msg("CreateMTGFilterPreset: Error reading inserted preset")
			return nil, err
		}
	}

	if presetDB.ID == nil {
		log.Error().Msg("CreateMTGFilterPreset: Insert returned empty preset")
		return nil, errors.New("failed to create filter preset")
	}

	edgeQuery := arango.NewQuery( /* aql */ `
        INSERT {
            _from: CONCAT(@deckCollection, "/", @deckID),
            _to: CONCAT(@presetCollection, "/", @presetID)
        } INTO mtg_filter_preset_for_deck
    `)

	edgeQuery.AddBindVar("deckCollection", arango.MTG_DECKS_COLLECTION.String())
	edgeQuery.AddBindVar("presetCollection", arango.MTG_FILTER_PRESETS_COLLECTION.String())
	edgeQuery.AddBindVar("deckID", deckID)
	edgeQuery.AddBindVar("presetID", *presetDB.ID)

	if _, err := arango.DB.Query(ctx, edgeQuery.Query, edgeQuery.BindVars); err != nil {
		log.Error().Err(err).Msg("CreateMTGFilterPreset: Error creating deck edge")
		return nil, err
	}

	log.Info().Str("presetID", *presetDB.ID).Msg("CreateMTGFilterPreset: Finished")
	return presetDB.ToModel(), nil
}

// UpdateMTGFilterPreset updates fields on an existing preset owned by the user.
func UpdateMTGFilterPreset(ctx context.Context, input model.MtgUpdateFilterPresetInput) (*model.MtgFilterPreset, error) {
	log.Info().Str("presetID", input.PresetID).Msg("UpdateMTGFilterPreset: Started")

	presetDB, err := getFilterPresetByID(ctx, input.PresetID)
	if err != nil {
		return nil, err
	}
	if presetDB == nil {
		return nil, errFilterPresetNotFound
	}

	updateFields := map[string]any{}

	if input.Name != nil {
		trimmed := strings.TrimSpace(*input.Name)
		if trimmed == "" {
			return nil, errors.New("name cannot be empty")
		}
		updateFields["name"] = trimmed
	}

	if input.FilterState != nil {
		updateFields["filterState"] = input.FilterState
	}

	if input.SortState != nil {
		updateFields["sortState"] = model.SortInputToState(input.SortState)
	}

	if input.Page != nil {
		updateFields["page"] = *input.Page
	}

	updateFields["savedAt"] = time.Now().UTC().Format(time.RFC3339)

	aq := arango.NewQuery( /* aql */ `
        UPDATE {
            _key: @presetID
        } WITH @updates IN mtg_filter_presets
        RETURN NEW
    `)

	aq.AddBindVar("presetID", input.PresetID)
	aq.AddBindVar("updates", updateFields)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("UpdateMTGFilterPreset: Error updating preset")
		return nil, err
	}
	defer cursor.Close()

	var updatedPreset model.MTGFilterPresetDB
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &updatedPreset)
		if err != nil {
			log.Error().Err(err).Msg("UpdateMTGFilterPreset: Error reading updated preset")
			return nil, err
		}
	}

	if updatedPreset.ID == nil {
		return nil, errFilterPresetNotFound
	}

	log.Info().Str("presetID", *updatedPreset.ID).Msg("UpdateMTGFilterPreset: Finished")
	return updatedPreset.ToModel(), nil
}

// DeleteMTGFilterPreset removes a preset and its deck edge.
func DeleteMTGFilterPreset(ctx context.Context, input model.MtgDeleteFilterPresetInput) (*model.Response, error) {
	log.Info().Str("presetID", input.PresetID).Msg("DeleteMTGFilterPreset: Started")

	presetDB, err := getFilterPresetByID(ctx, input.PresetID)
	if err != nil {
		return nil, err
	}
	if presetDB == nil {
		return nil, errFilterPresetNotFound
	}

	removePreset := arango.NewQuery( /* aql */ `
        REMOVE {
            _key: @presetID
        } IN mtg_filter_presets
    `)
	removePreset.AddBindVar("presetID", input.PresetID)

	if _, err := arango.DB.Query(ctx, removePreset.Query, removePreset.BindVars); err != nil {
		log.Error().Err(err).Msg("DeleteMTGFilterPreset: Error deleting preset")
		return nil, err
	}

	removeEdge := arango.NewQuery( /* aql */ `
        FOR edge IN mtg_filter_preset_for_deck
            FILTER edge._to == CONCAT(@presetCollection, "/", @presetID)
            REMOVE edge IN mtg_filter_preset_for_deck
    `)
	removeEdge.AddBindVar("presetCollection", arango.MTG_FILTER_PRESETS_COLLECTION.String())
	removeEdge.AddBindVar("presetID", input.PresetID)

	if _, err := arango.DB.Query(ctx, removeEdge.Query, removeEdge.BindVars); err != nil {
		log.Error().Err(err).Msg("DeleteMTGFilterPreset: Error deleting preset edge")
		return nil, err
	}

	log.Info().Str("presetID", input.PresetID).Msg("DeleteMTGFilterPreset: Finished")
	return &model.Response{Status: true}, nil
}

func getFilterPresetByID(ctx context.Context, presetID string) (*model.MTGFilterPresetDB, error) {
	aq := arango.NewQuery( /* aql */ `
        FOR preset IN mtg_filter_presets
            FILTER preset._key == @presetID
            LIMIT 1
            RETURN preset
    `)

	aq.AddBindVar("presetID", presetID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("getFilterPresetByID: Error querying preset")
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		return nil, nil
	}

	var presetDB model.MTGFilterPresetDB
	_, err = cursor.ReadDocument(ctx, &presetDB)
	if err != nil {
		log.Error().Err(err).Msg("getFilterPresetByID: Error reading preset")
		return nil, err
	}

	return &presetDB, nil
}
