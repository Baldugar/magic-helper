package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// GetMTGTags returns all tags from the mtg_tags collection.
func GetMTGTags(ctx context.Context) ([]*model.MtgTag, error) {
	log.Info().Msg("GetMTGTags: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR tag IN mtg_tags
		SORT tag.name ASC
		RETURN { _key: tag._key, name: tag.name }
	`)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTags: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var out []*model.MtgTag
	for cursor.HasMore() {
		var tag model.MtgTag
		_, err := cursor.ReadDocument(ctx, &tag)
		if err != nil {
			log.Error().Err(err).Msg("GetMTGTags: Error reading document")
			return nil, err
		}
		out = append(out, &tag)
	}

	log.Info().Msg("GetMTGTags: Finished")
	return out, nil
}

// GetMTGTag returns a single tag by ID, or nil if not found.
func GetMTGTag(ctx context.Context, tagID string) (*model.MtgTag, error) {
	log.Info().Str("tagID", tagID).Msg("GetMTGTag: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR tag IN mtg_tags
		FILTER tag._key == @tagID
		LIMIT 1
		RETURN { _key: tag._key, name: tag.name }
	`)

	aq.AddBindVar("tagID", tagID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTag: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		log.Info().Msg("GetMTGTag: Tag not found")
		return nil, nil
	}

	var tag model.MtgTag
	_, err = cursor.ReadDocument(ctx, &tag)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTag: Error reading document")
		return nil, err
	}

	log.Info().Msg("GetMTGTag: Finished")
	return &tag, nil
}

// GetTagsForCard returns the list of tags assigned to the given card (for index sync).
func GetTagsForCard(ctx context.Context, cardID string) ([]*model.MtgTag, error) {
	aq := arango.NewQuery( /* aql */ `
		FOR tag IN 1..1 INBOUND CONCAT("mtg_cards", "/", @cardID) mtg_tag_to_card
		SORT tag.name ASC
		RETURN { _key: tag._key, name: tag.name }
	`)

	aq.AddBindVar("cardID", cardID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	var out []*model.MtgTag
	for cursor.HasMore() {
		var tag model.MtgTag
		_, err := cursor.ReadDocument(ctx, &tag)
		if err != nil {
			return nil, err
		}
		t := tag
		out = append(out, &t)
	}
	return out, nil
}
