package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/mtgCardSearch"

	"github.com/rs/zerolog/log"
)

func Rate(ctx context.Context, input model.RateInput) (*model.Response, error) {
	var toCollection arango.ArangoDocument
	if input.EntityType == model.RatableEntityTypeCard {
		toCollection = arango.MTG_CARDS_COLLECTION
	} else {
		toCollection = arango.MTG_TAGS_COLLECTION
	}

	aq := arango.NewQuery( /* aql */ `
		UPSERT { 
			_from: @from, 
			_to: CONCAT(@toCollection, "/", @entityID) 
		}
		INSERT { 
			_from: @from, 
			_to: CONCAT(@toCollection, "/", @entityID), 
			value: @value 
		}
		UPDATE { 
			value: @value 
		}
		IN MTG_User_Rating
		RETURN NEW._key
	`)

	aq.AddBindVar("from", arango.USERS_COLLECTION.String()+"/USER_ID")
	aq.AddBindVar("toCollection", toCollection.String())
	aq.AddBindVar("entityID", input.EntityID)
	aq.AddBindVar("value", input.Value)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msg("Error rating entity")
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
		log.Error().Err(err).Msg("Error reading new rating key")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	// If the entity is a card, update the card index
	if input.EntityType == model.RatableEntityTypeCard {
		err = mtgCardSearch.UpdateCardInIndex(ctx, input.EntityID)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msg("Error updating card in index")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	} else { // If the entity is a tag, we need to update all cards that have that tag // TODO: For now we update it all
		cards, err := GetMTGCards(ctx)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msg("Error updating card in index")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
		err = mtgCardSearch.BuildCardIndexWithCards(cards)
		if err != nil {
			errMsg := err.Error()
			log.Error().Err(err).Msg("Error updating card in index")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}
