package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util/auth"

	"github.com/rs/zerolog/log"
)

// GetMTGCardPackages returns card packages and their cards, optionally filtered by ID or visibility.
func GetMTGCardPackages(ctx context.Context, cardPackageID *string, includePublic bool) ([]*model.MtgCardPackage, error) {
	log.Info().Msg("GetMTGCardPackages: Started")

	user, _ := auth.UserFromContext(ctx)
	ownerID := ""
	if user != nil && user.ID != "" {
		ownerID = user.ID
	}

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Card_Packages
			LET requestedID = @cardPackageID
			LET ownerMatches = doc.ownerID == @ownerID OR doc.ownerID == null OR doc.ownerID == ""
			LET docIsPublic = doc.isPublic == true
			FILTER (
				(requestedID != null AND doc._key == requestedID AND (ownerMatches OR (@includePublic AND docIsPublic))) OR
				(requestedID == null AND (ownerMatches OR (@includePublic AND docIsPublic)))
			)
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

		RETURN MERGE(doc, {
			cards,
			isPublic: docIsPublic,
			ownerID: doc.ownerID
		})
	`)

	aq.AddBindVar("ownerID", ownerID)
	aq.AddBindVar("includePublic", includePublic)
	if cardPackageID != nil {
		aq.AddBindVar("cardPackageID", *cardPackageID)
	} else {
		aq.AddBindVar("cardPackageID", nil)
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
