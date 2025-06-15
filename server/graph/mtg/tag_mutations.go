package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateTag(ctx context.Context, input model.CreateTagInput) (string, error) {
	tag := &model.TagDB{
		Type:        input.Type,
		Name:        input.Name,
		Description: input.Description,
	}

	if input.Type == model.TagTypeDeckTag {
		// convert []model.MtgColor to []*model.MtgColor
		colors := make([]*model.MtgColor, len(input.Colors))
		for i, c := range input.Colors {
			color := c
			colors[i] = &color
		}
		tag.Colors = colors
	}

	aq := arango.NewQuery(`
		INSERT @tag INTO @@tagsCollection
		LET newTag = NEW
	`)
	aq.AddBindVar("tag", tag)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)

	if input.CardID != nil {
		aq.Query += `
			INSERT {
				_from: newTag._id,
				_to: CONCAT(@cardsCollection, "/", @cardID)
			} INTO @@cardTagEdgeCollection
		`
		aq.AddBindVar("cardID", *input.CardID)
		aq.AddBindVar("@cardsCollection", arango.MTG_CARDS_COLLECTION)
		aq.AddBindVar("@cardTagEdgeCollection", arango.MTG_TAG_EDGE_COLLECTION)
	}

	aq.Query += `
		RETURN newTag._key
	`

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error creating tag")
		return "", err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		log.Error().Err(err).Msg("Error reading new tag key")
		return "", err
	}

	return key, nil
}

func UpdateTag(ctx context.Context, input model.UpdateTagInput) (string, error) {
	aq := arango.NewQuery(`
		UPDATE @key WITH {
			name: @name,
			description: @description,
			colors: @colors
		} IN @@tagsCollection
		RETURN NEW._key
	`)
	aq.AddBindVar("key", input.ID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("description", input.Description)
	aq.AddBindVar("colors", input.Colors)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error updating tag")
		return "", err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		log.Error().Err(err).Msg("Error reading updated tag key")
		return "", err
	}

	return key, nil
}

func DeleteTag(ctx context.Context, tagID string) (string, error) {
	// remove edges first
	aq := arango.NewQuery(`
		FOR edge IN @@edgeCollection
			FILTER edge._from == CONCAT(@tagsCollection, "/", @tagID)
			REMOVE edge IN @@edgeCollection
	`)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("tagID", tagID)
	aq.AddBindVar("@edgeCollection", arango.MTG_TAG_EDGE_COLLECTION)
	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error deleting tag edges")
		return "", err
	}

	// remove tag
	aq = arango.NewQuery(`
		REMOVE @key IN @@tagsCollection
		RETURN OLD._key
	`)
	aq.AddBindVar("key", tagID)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error deleting tag")
		return "", err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		log.Error().Err(err).Msg("Error reading deleted tag key")
		return "", err
	}

	return key, nil
}

func AssignTag(ctx context.Context, input model.AssignTagInput) (bool, error) {
	aq := arango.NewQuery(`
		INSERT {
			_from: CONCAT(@tagsCollection, "/", @tagID),
			_to: CONCAT(@cardsCollection, "/", @cardID)
		} INTO @@edgeCollection
	`)
	aq.AddBindVar("@cardsCollection", arango.MTG_CARDS_COLLECTION)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("@edgeCollection", arango.MTG_TAG_EDGE_COLLECTION)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error assigning tag")
		return false, err
	}

	return true, nil
}

func UnassignTag(ctx context.Context, input model.UnassignTagInput) (bool, error) {
	aq := arango.NewQuery(`
		FOR edge IN @@edgeCollection
			FILTER edge._from == CONCAT(@tagsCollection, "/", @tagID)
			FILTER edge._to == CONCAT(@cardsCollection, "/", @cardID)
			REMOVE edge IN @@edgeCollection
	`)
	aq.AddBindVar("@cardsCollection", arango.MTG_CARDS_COLLECTION)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("@tagsCollection", arango.MTG_TAGS_COLLECTION)
	aq.AddBindVar("tagID", input.TagID)
	aq.AddBindVar("@edgeCollection", arango.MTG_TAG_EDGE_COLLECTION)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error unassigning tag")
		return false, err
	}

	return true, nil
}
