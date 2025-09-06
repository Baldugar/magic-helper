package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// GetMTGCardPackages returns card packages and their cards, optionally filtered by ID.
func GetMTGCardPackages(ctx context.Context, cardPackageID *string) ([]*model.MtgCardPackage, error) {
	log.Info().Msg("GetMTGCardPackages: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Card_Packages
			// single: FILTER doc._key == @cardPackageID
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc MTG_Card_Card_Package
				LET rating = FIRST( // Remove FIRST when we get multiaccount
					FOR node, ratingEdge IN 1..1 INBOUND card MTG_User_Rating
					RETURN {
						user: node,
						value: ratingEdge.value
					}
				)
				LET cardTags = (
					FOR tag, tagEdge IN 1..1 INBOUND card MTG_Tag_CardDeck
					FILTER tag.type == "CardTag"
					LET cardTagRating = FIRST( // Remove FIRST when we get multiaccount
						FOR node, ratingEdge IN 1..1 INBOUND tag MTG_User_Rating
						RETURN {
							user: node,
							value: ratingEdge.value
						}
					)
					RETURN MERGE(tag, {
						myRating: cardTagRating
					})
				)
				LET deckTags = (
					FOR tag, tagEdge IN 1..1 INBOUND card MTG_Tag_CardDeck
					FILTER tag.type == "DeckTag"
					LET cardTagRating = FIRST( // Remove FIRST when we get multiaccount
						FOR node, ratingEdge IN 1..1 INBOUND tag MTG_User_Rating
						RETURN {
							user: node,
							value: ratingEdge.value
						}
					)
					RETURN MERGE(tag, {
						myRating: cardTagRating
					})
				)
				RETURN MERGE(edge, {
					card: card,
					count: edge.count,
					mainOrSide: edge.mainOrSide,
					selectedVersionID: edge.selectedVersionID,
					myRating: rating,
					cardTags: cardTags,
					deckTags: deckTags,
				})
			)

		RETURN MERGE(doc, {cards})
	`)

	if cardPackageID != nil {
		aq = aq.AddBindVar("cardPackageID", *cardPackageID)
		aq = aq.Uncomment("single")
	}

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGCardPackages: Error querying database")
		return nil, err
	}

	var cardPackages []*model.MtgCardPackage
	for cursor.HasMore() {
		var cardPackage *model.MtgCardPackage
		_, err := cursor.ReadDocument(ctx, &cardPackage)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGCardPackages: Error reading document")
			return nil, err
		}
		cardPackages = append(cardPackages, cardPackage)
	}
	return cardPackages, nil
}
