package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetTags(ctx context.Context) ([]model.Tag, error) {
	aq := arango.NewQuery(`
		FOR tag IN @@tagsCollection
			RETURN tag
	`)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error getting tags")
		return nil, err
	}
	defer cursor.Close()

	var tags []model.Tag
	for cursor.HasMore() {
		var tagDB model.TagDB
		_, err := cursor.ReadDocument(ctx, &tagDB)
		if err != nil {
			log.Error().Err(err).Msg("Error reading tag")
			return nil, err
		}

		if tagDB.Type == model.TagTypeCardTag {
			tags = append(tags, &model.CardTag{
				ID:          tagDB.ID,
				Name:        tagDB.Name,
				Description: tagDB.Description,
			})
		} else {
			tags = append(tags, &model.DeckTag{
				ID:          tagDB.ID,
				Name:        tagDB.Name,
				Description: tagDB.Description,
				Colors:      model.ConvertMtgColorSlice(tagDB.Colors),
			})
		}
	}

	return tags, nil
}

func GetCardTags(ctx context.Context) ([]*model.CardTag, error) {
	aq := arango.NewQuery(`
		FOR tag IN @@tagsCollection
			FILTER tag.type == @type
			RETURN tag
	`)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("type", model.TagTypeCardTag)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error getting card tags")
		return nil, err
	}
	defer cursor.Close()

	var tags []*model.CardTag
	for cursor.HasMore() {
		var tagDB model.TagDB
		_, err := cursor.ReadDocument(ctx, &tagDB)
		if err != nil {
			log.Error().Err(err).Msg("Error reading card tag")
			return nil, err
		}
		tags = append(tags, &model.CardTag{
			ID:          tagDB.ID,
			Name:        tagDB.Name,
			Description: tagDB.Description,
		})
	}

	return tags, nil
}

func GetDeckTags(ctx context.Context) ([]*model.DeckTag, error) {
	aq := arango.NewQuery(`
		FOR tag IN @@tagsCollection
			FILTER tag.type == @type
			RETURN tag
	`)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("type", model.TagTypeDeckTag)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error getting deck tags")
		return nil, err
	}
	defer cursor.Close()

	var tags []*model.DeckTag
	for cursor.HasMore() {
		var tagDB model.TagDB
		_, err := cursor.ReadDocument(ctx, &tagDB)
		if err != nil {
			log.Error().Err(err).Msg("Error reading deck tag")
			return nil, err
		}
		tags = append(tags, &model.DeckTag{
			ID:          tagDB.ID,
			Name:        tagDB.Name,
			Description: tagDB.Description,
			Colors:      model.ConvertMtgColorSlice(tagDB.Colors),
		})
	}

	return tags, nil
}

func GetTag(ctx context.Context, id string) (model.Tag, error) {
	aq := arango.NewQuery(`
		FOR tag IN @@tagsCollection
			FILTER tag._key == @id
			RETURN tag
	`)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("id", id)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error getting tag %s", id)
		return nil, err
	}
	defer cursor.Close()

	var tagDB model.TagDB
	_, err = cursor.ReadDocument(ctx, &tagDB)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading tag %s", id)
		return nil, err
	}

	if tagDB.Type == model.TagTypeCardTag {
		return &model.CardTag{
			ID:          tagDB.ID,
			Name:        tagDB.Name,
			Description: tagDB.Description,
		}, nil
	}

	return &model.DeckTag{
		ID:          tagDB.ID,
		Name:        tagDB.Name,
		Description: tagDB.Description,
		Colors:      model.ConvertMtgColorSlice(tagDB.Colors),
	}, nil
}
