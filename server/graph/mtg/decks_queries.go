package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetMTGDecks(ctx context.Context, deckID *string) ([]*model.MtgDeck, error) {
	log.Info().Msg("GetMTGADecks: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
			// deckID: FILTER doc._key == @deckID
			LET cardFrontImage = FIRST(
				FOR card, edge IN 1..1 OUTBOUND doc @@edge
					LET version = (
						FOR v IN card.versions
							FILTER v.ID == edge.versionID
							RETURN v
					)
					FILTER LENGTH(version) > 0
				RETURN MERGE(card, {versions: version})
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc @@edge2
				SORT edge.position.x ASC, edge.position.y ASC
				RETURN MERGE(edge, {					
					card: card,
					count: edge.count,
					position: edge.position,
					mainOrSide: edge.mainOrSide,
					deckCardType: edge.deckCardType,
					phantoms: edge.phantoms
				})
			)
		RETURN MERGE(doc, {cardFrontImage, cards})
	`)

	col := arango.MTG_DECKS_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("@edge", arango.MTG_DECK_FRONT_CARD_IMAGE_EDGE)
	aq.AddBindVar("@edge2", arango.MTG_CARD_DECK_EDGE)

	if deckID != nil {
		aq = aq.Uncomment("deckID").AddBindVar("deckID", *deckID)
	}

	log.Info().Str("query", aq.Query).Msg("GetMTGADecks: Querying database")

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGADecks: Error querying database")
		return nil, err
	}

	var decks []*model.MtgDeck
	defer cursor.Close()
	for cursor.HasMore() {
		var deck model.MtgDeck
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
