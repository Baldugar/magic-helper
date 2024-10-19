package mtga

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetMTGADecks(ctx context.Context, deckID *string) ([]*model.MtgaDeck, error) {
	log.Info().Msg("GetMTGADecks: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
			// deckID: FILTER doc._key == @deckID
			LET cardFrontImage = FIRST(
				FOR image IN 1..1 OUTBOUND doc @@edge
				RETURN image
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc @@edge2
				RETURN {
					card: card,
					count: edge.count,
					position: edge.position,
					cardPosition: edge.cardPosition,
					type: edge.type
				}
			)
		RETURN MERGE(doc, {cardFrontImage, cards})
	`)

	aq.AddBindVar("@collection", arango.MTGA_DECKS_COLLECTION)
	aq.AddBindVar("@edge", arango.MTGA_DECK_FRONT_CARD_IMAGE_EDGE)
	aq.AddBindVar("@edge2", arango.MTGA_CARD_DECK_EDGE)

	if deckID != nil {
		aq = aq.Uncomment("deckID").AddBindVar("deckID", *deckID)
	}

	log.Info().Str("query", aq.Query).Msg("GetMTGADecks: Querying database")

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGADecks: Error querying database")
		return nil, err
	}

	var decks []*model.MtgaDeck
	defer cursor.Close()
	for cursor.HasMore() {
		var deck model.MtgaDeck
		_, err := cursor.ReadDocument(ctx, &deck)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGADecks: Error reading document")
			return nil, err
		}
		decks = append(decks, &deck)
	}

	log.Info().Msg("GetMTGADecks: Finished")
	return decks, nil
}
