package mtg

import (
	"context"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/auth"

	"github.com/rs/zerolog/log"
)

// GetMTGFilterPresets returns all saved presets for a deck owned by the current user.
func GetMTGFilterPresets(ctx context.Context, deckID string) ([]*model.MtgFilterPreset, error) {
	log.Info().Str("deckID", deckID).Msg("GetMTGFilterPresets: Started")

	if deckID == "" {
		log.Warn().Msg("GetMTGFilterPresets: Missing deckID")
		return []*model.MtgFilterPreset{}, nil
	}

	user, _ := auth.UserFromContext(ctx)
	if user == nil || user.ID == "" {
		log.Warn().Msg("GetMTGFilterPresets: Missing user in context")
		return []*model.MtgFilterPreset{}, nil
	}

	aq := arango.NewQuery( /* aql */ `
        FOR preset IN MTG_Filter_Presets
            FILTER preset.deckID == @deckID AND preset.ownerID == @ownerID
            SORT preset.savedAt DESC
            RETURN preset
    `)

	aq.AddBindVar("deckID", deckID)
	aq.AddBindVar("ownerID", user.ID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGFilterPresets: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	presets := []*model.MtgFilterPreset{}
	for cursor.HasMore() {
		var presetDB MTGFilterPresetDB
		_, err := cursor.ReadDocument(ctx, &presetDB)
		if err != nil {
			log.Error().Err(err).Msg("GetMTGFilterPresets: Error reading document")
			return nil, err
		}
		presets = append(presets, presetDB.ToModel())
	}

	log.Info().Msg("GetMTGFilterPresets: Finished")
	return presets, nil
}
