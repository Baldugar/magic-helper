package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func Rate(ctx context.Context, input model.RateInput) (string, error) {
	var toCollection arango.ArangoDocument
	if input.EntityType == model.RatableEntityTypeCard {
		toCollection = arango.MTG_CARDS_COLLECTION
	} else {
		toCollection = arango.MTG_TAGS_COLLECTION
	}

	aq := arango.NewQuery(`
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
		IN @@edgeCollection
		RETURN NEW._key
	`)

	aq.AddBindVar("from", arango.USERS_COLLECTION.String()+"/"+input.UserID)
	aq.AddBindVar("toCollection", toCollection.String())
	aq.AddBindVar("entityID", input.EntityID)
	aq.AddBindVar("value", input.Value)
	aq.AddBindVar("@edgeCollection", arango.MTG_USER_RATING_EDGE_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error rating entity")
		return "", err
	}
	defer cursor.Close()

	var key string
	_, err = cursor.ReadDocument(ctx, &key)
	if err != nil {
		log.Error().Err(err).Msg("Error reading new rating key")
		return "", err
	}

	return key, nil
}
