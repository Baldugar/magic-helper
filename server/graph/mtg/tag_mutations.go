package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/mtgCardSearch"

	"github.com/rs/zerolog/log"
)

func CreateTag(ctx context.Context, input model.CreateTagInput) (*model.Response, error) {
	tagDB := &model.TagDB{
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
		tagDB.Colors = colors
	}

	aq := arango.NewQuery( /* aql */ `
		INSERT @tagDB INTO MTG_Tags
	`)
	aq.AddBindVar("tagDB", tagDB)

	if input.CardID != nil {
		aq.Query += /* aql */ `
			INSERT {
				_from: NEW._id,
				_to: CONCAT("MTG_Cards", "/", @cardID)
			} INTO MTG_Tag_CardDeck
		`
		aq.AddBindVar("cardID", *input.CardID)
	}

	aq.Query += /* aql */ `
		RETURN NEW
	`

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error creating tag")
		errMsg := err.Error()
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}
	defer cursor.Close()

	var tag map[string]any
	_, err = cursor.ReadDocument(ctx, &tag)
	if err != nil {
		log.Error().Err(err).Msg("Error reading new tag")
		errMsg := err.Error()
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	tagID := tag["_key"].(string)

	if input.CardID != nil {
		err = mtgCardSearch.UpdateCardInIndex(ctx, *input.CardID)
		if err != nil {
			log.Error().Err(err).Msg("Error updating card in index")
			errMsg := err.Error()
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	return &model.Response{
		Status:  true,
		Message: &tagID,
	}, nil
}

func UpdateTag(ctx context.Context, input model.UpdateTagInput) (*model.Response, error) {
	aq := arango.NewQuery( /* aql */ `
		UPDATE @key WITH {
			name: @name,
			description: @description,
			colors: @colors
		} IN MTG_Tags
		RETURN NEW._key
	`)
	aq.AddBindVar("key", input.ID)
	aq.AddBindVar("name", input.Name)
	aq.AddBindVar("description", input.Description)
	aq.AddBindVar("colors", input.Colors)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error updating tag")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error reading updated tag key")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}
	cards := mtgCardSearch.GetAllCardsFromIndex()
	for _, card := range cards {
		for _, tag := range card.CardTags {
			if tag.ID == key {
				tag.Name = *input.Name
				tag.Description = input.Description
			}
		}
		for _, tag := range card.DeckTags {
			if tag.ID == key {
				tag.Name = *input.Name
				tag.Description = input.Description
				tag.Colors = input.Colors
			}
		}
	}
	mtgCardSearch.BuildCardIndexWithCards(cards)

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func DeleteTag(ctx context.Context, tagID string) (*model.Response, error) {
	// remove edges first
	aq := arango.NewQuery( /* aql */ `
		FOR edge IN MTG_Tag_CardDeck
			FILTER edge._from == CONCAT("MTG_Tags", "/", @tagID)
			REMOVE edge IN MTG_Tag_CardDeck
	`)
	aq.AddBindVar("tagID", tagID)
	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error deleting tag edges")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	// remove tag
	aq = arango.NewQuery( /* aql */ `
		REMOVE @key IN MTG_Tags
		RETURN OLD._key
	`)
	aq.AddBindVar("key", tagID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error deleting tag")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error reading deleted tag key")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	cards := mtgCardSearch.GetAllCardsFromIndex()
	for _, card := range cards {
		newCardTags := make([]*model.CardTag, 0)
		for _, tag := range card.CardTags {
			if tag.ID == key {
				continue
			}
			newCardTags = append(newCardTags, tag)
		}
		card.CardTags = newCardTags
		newDeckTags := make([]*model.DeckTag, 0)
		for _, tag := range card.DeckTags {
			if tag.ID == key {
				continue
			}
			newDeckTags = append(newDeckTags, tag)
		}
		card.DeckTags = newDeckTags
	}
	mtgCardSearch.BuildCardIndexWithCards(cards)

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func AssignTag(ctx context.Context, input model.AssignTagInput) (*model.Response, error) {
	aq := arango.NewQuery( /* aql */ `
		INSERT {
			_from: CONCAT("MTG_Tags", "/", @tagID),
			_to: CONCAT("MTG_Cards", "/", @cardID)
		} INTO MTG_Tag_CardDeck
	`)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("tagID", input.TagID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error assigning tag")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	err = mtgCardSearch.UpdateCardInIndex(ctx, input.CardID)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error updating card in index")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func UnassignTag(ctx context.Context, input model.UnassignTagInput) (*model.Response, error) {
	aq := arango.NewQuery( /* aql */ `
		FOR edge IN MTG_Tag_CardDeck
			FILTER edge._from == CONCAT("MTG_Tags", "/", @tagID)
			FILTER edge._to == CONCAT("MTG_Cards", "/", @cardID)
			REMOVE edge IN MTG_Tag_CardDeck
	`)
	aq.AddBindVar("cardID", input.CardID)
	aq.AddBindVar("tagID", input.TagID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error unassigning tag")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	err = mtgCardSearch.UpdateCardInIndex(ctx, input.CardID)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error updating card in index")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}
