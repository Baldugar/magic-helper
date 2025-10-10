package mtg

import (
	"context"
	"errors"
	"strings"
	"time"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/auth"

	"github.com/rs/zerolog/log"
)

var (
	errFilterPresetUnauthorized = errors.New("unauthorized")
	errFilterPresetNotFound     = errors.New("filter preset not found")
)

// CreateMTGFilterPreset persists a new preset and links it to the target deck.
func CreateMTGFilterPreset(ctx context.Context, input model.MtgCreateFilterPresetInput) (*model.MtgFilterPreset, error) {
	log.Info().Str("deckID", input.DeckID).Msg("CreateMTGFilterPreset: Started")

	user, _ := auth.UserFromContext(ctx)
	if user == nil || user.ID == "" {
		log.Error().Msg("CreateMTGFilterPreset: Missing user in context")
		return nil, errFilterPresetUnauthorized
	}

	deckID := strings.TrimSpace(input.DeckID)
	if deckID == "" {
		return nil, errors.New("deckID is required")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}

	filterData := input.Filter
	if filterData == nil {
		filterData = map[string]any{}
	}

	sortState := sortInputToState(input.Sort)
	if sortState == nil {
		sortState = []*model.MtgFilterSortState{}
	}

	savedAt := time.Now().UTC().Format(time.RFC3339)

	aq := arango.NewQuery( /* aql */ `
        INSERT {
            deckID: @deckID,
            ownerID: @ownerID,
            name: @name,
            savedAt: @savedAt,
            filter: @filter,
            sort: @sort,
            page: @page
        } INTO MTG_Filter_Presets
        RETURN NEW
    `)

	aq.AddBindVar("deckID", deckID)
	aq.AddBindVar("ownerID", user.ID)
	aq.AddBindVar("name", name)
	aq.AddBindVar("savedAt", savedAt)
	aq.AddBindVar("filter", filterData)
	aq.AddBindVar("sort", sortState)
	aq.AddBindVar("page", input.Page)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("CreateMTGFilterPreset: Error inserting preset")
		return nil, err
	}
	defer cursor.Close()

	var presetDB MTGFilterPresetDB
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &presetDB)
		if err != nil {
			log.Error().Err(err).Msg("CreateMTGFilterPreset: Error reading inserted preset")
			return nil, err
		}
	}

	if presetDB.ID == "" {
		log.Error().Msg("CreateMTGFilterPreset: Insert returned empty preset")
		return nil, errors.New("failed to create filter preset")
	}

	edgeQuery := arango.NewQuery( /* aql */ `
        INSERT {
            _from: CONCAT(@deckCollection, "/", @deckID),
            _to: CONCAT(@presetCollection, "/", @presetID)
        } INTO MTG_Filter_Preset_Deck
    `)

	edgeQuery.AddBindVar("deckCollection", arango.MTG_DECKS_COLLECTION.String())
	edgeQuery.AddBindVar("presetCollection", arango.MTG_FILTER_PRESETS_COLLECTION.String())
	edgeQuery.AddBindVar("deckID", deckID)
	edgeQuery.AddBindVar("presetID", presetDB.ID)

	if _, err := arango.DB.Query(ctx, edgeQuery.Query, edgeQuery.BindVars); err != nil {
		log.Error().Err(err).Msg("CreateMTGFilterPreset: Error creating deck edge")
		return nil, err
	}

	log.Info().Str("presetID", presetDB.ID).Msg("CreateMTGFilterPreset: Finished")
	return presetDB.ToModel(), nil
}

// UpdateMTGFilterPreset updates fields on an existing preset owned by the user.
func UpdateMTGFilterPreset(ctx context.Context, input model.MtgUpdateFilterPresetInput) (*model.MtgFilterPreset, error) {
	log.Info().Str("presetID", input.PresetID).Msg("UpdateMTGFilterPreset: Started")

	user, _ := auth.UserFromContext(ctx)
	if user == nil || user.ID == "" {
		log.Error().Msg("UpdateMTGFilterPreset: Missing user in context")
		return nil, errFilterPresetUnauthorized
	}

	presetDB, err := getFilterPresetByID(ctx, input.PresetID)
	if err != nil {
		return nil, err
	}
	if presetDB == nil || presetDB.OwnerID == nil || *presetDB.OwnerID != user.ID {
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

	if input.Filter != nil {
		updateFields["filter"] = input.Filter
	}

	if input.Sort != nil {
		updateFields["sort"] = sortInputToState(input.Sort)
	}

	if input.Page != nil {
		updateFields["page"] = *input.Page
	}

	updateFields["savedAt"] = time.Now().UTC().Format(time.RFC3339)

	aq := arango.NewQuery( /* aql */ `
        UPDATE {
            _key: @presetID
        } WITH @updates IN MTG_Filter_Presets
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

	var updatedPreset MTGFilterPresetDB
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &updatedPreset)
		if err != nil {
			log.Error().Err(err).Msg("UpdateMTGFilterPreset: Error reading updated preset")
			return nil, err
		}
	}

	if updatedPreset.ID == "" {
		return nil, errFilterPresetNotFound
	}

	log.Info().Str("presetID", updatedPreset.ID).Msg("UpdateMTGFilterPreset: Finished")
	return updatedPreset.ToModel(), nil
}

// DeleteMTGFilterPreset removes a preset and its deck edge.
func DeleteMTGFilterPreset(ctx context.Context, input model.MtgDeleteFilterPresetInput) (*model.Response, error) {
	log.Info().Str("presetID", input.PresetID).Msg("DeleteMTGFilterPreset: Started")

	user, _ := auth.UserFromContext(ctx)
	if user == nil || user.ID == "" {
		log.Error().Msg("DeleteMTGFilterPreset: Missing user in context")
		return nil, errFilterPresetUnauthorized
	}

	presetDB, err := getFilterPresetByID(ctx, input.PresetID)
	if err != nil {
		return nil, err
	}
	if presetDB == nil || presetDB.OwnerID == nil || *presetDB.OwnerID != user.ID {
		return nil, errFilterPresetNotFound
	}

	removePreset := arango.NewQuery( /* aql */ `
        REMOVE {
            _key: @presetID
        } IN MTG_Filter_Presets
    `)
	removePreset.AddBindVar("presetID", input.PresetID)

	if _, err := arango.DB.Query(ctx, removePreset.Query, removePreset.BindVars); err != nil {
		log.Error().Err(err).Msg("DeleteMTGFilterPreset: Error deleting preset")
		return nil, err
	}

	removeEdge := arango.NewQuery( /* aql */ `
        FOR edge IN MTG_Filter_Preset_Deck
            FILTER edge._to == CONCAT(@presetCollection, "/", @presetID)
            REMOVE edge IN MTG_Filter_Preset_Deck
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

func getFilterPresetByID(ctx context.Context, presetID string) (*MTGFilterPresetDB, error) {
	aq := arango.NewQuery( /* aql */ `
        FOR preset IN MTG_Filter_Presets
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

	var presetDB MTGFilterPresetDB
	_, err = cursor.ReadDocument(ctx, &presetDB)
	if err != nil {
		log.Error().Err(err).Msg("getFilterPresetByID: Error reading preset")
		return nil, err
	}

	return &presetDB, nil
}
