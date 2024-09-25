package mtga

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetMTGACards(ctx context.Context) ([]*model.MtgaCard, error) {
	log.Info().Msg("GetMTGACards: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
		RETURN doc
	`)

	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGACards: Error querying database")
		return nil, err
	}

	var cards []*model.MtgaCard
	defer cursor.Close()
	for cursor.HasMore() {
		var card model.MtgaCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGACards: Error reading document")
			return nil, err
		}
		cards = append(cards, &card)
	}

	log.Info().Msg("GetMTGACards: Finished")
	return cards, nil
}
