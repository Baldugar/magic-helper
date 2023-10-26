package cards

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetCardsQuery(ctx context.Context) ([]*model.MTGACard, error) {
	log.Info().Msgf("GetCardsQuery: Started")
	aq := arango.NewQuery(`
		FOR c IN Cards
		RETURN MERGE(c, {
			id: c._key,
		})
	`)
	var cards []*model.MTGACard
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying cards")
		return nil, err
	}
	defer cursor.Close()
	for cursor.HasMore() {
		var card model.MTGACard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading card")
			return nil, err
		}
		cards = append(cards, &card)
	}
	log.Info().Msgf("GetCardsQuery: Finished")
	return cards, nil
}
