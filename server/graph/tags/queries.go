package tags

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// Returns all tags
func GetTagsQuery(ctx context.Context) (*model.GetTagsReturn, error) {
	log.Info().Msgf("GetTagsQuery: Started")
	aq := arango.NewQuery(`
		FOR t IN Tags
		COLLECT type = t.type INTO arangoTags
		LET tags = (
			FOR at IN arangoTags
			RETURN MERGE(at, {
				id: at._key,
			})
		)
		RETURN {
			type,
			tags,
		}
	`)
	var tags *model.GetTagsReturn
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying tags")
		return nil, err
	}
	defer cursor.Close()
	_, err = cursor.ReadDocument(ctx, &tags)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading tag")
		return nil, err
	}
	return tags, nil
}
