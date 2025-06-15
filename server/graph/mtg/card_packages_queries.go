package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"magic-helper/util/ctxkeys"

	"github.com/rs/zerolog/log"
)

func GetMTGCardPackages(ctx context.Context, cardPackageID *string) ([]*model.MtgCardPackage, error) {
	log.Info().Msg("GetMTGCardPackages: Started")

	// Debug logging for context
	log.Debug().
		Interface("context_keys", ctx.Value(ctxkeys.UserIDKey)).
		Msg("GetMTGCardPackages: Context debug")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
			// single: FILTER doc._key == @cardPackageID
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc @@cardPackageEdge
				LET ratings = (
					FOR user, rating IN 1..1 INBOUND card @@userRatingEdge
					RETURN {
						user: user,
						value: rating.value
					}
				)
				LET cardTags = (
					FOR tag, tagEdge IN 1..1 INBOUND card @@tagCardEdge
					FILTER tag.type == "CardTag"
					LET cardTagRatings = (
						FOR user, rating IN 1..1 INBOUND tag @@userRatingEdge
						RETURN {
							user: user,
							value: rating.value
						}
					)
					RETURN MERGE(tag, {
						aggregatedRating: {
							average: AVERAGE(cardTagRatings[*].value),
							count: LENGTH(cardTagRatings)
						},
						ratings: cardTagRatings,
						myRating: @userID != "" ? FIRST(
							FOR rating IN cardTagRatings
								FILTER rating.user._key == @userID
								RETURN rating
						) : {}
					})
				)
				LET deckTags = (
					FOR tag, tagEdge IN 1..1 INBOUND card @@tagCardEdge
					FILTER tag.type == "DeckTag"
					LET cardTagRatings = (
						FOR user, rating IN 1..1 INBOUND tag @@userRatingEdge
						RETURN {
							user: user,
							value: rating.value
						}
					)
					RETURN MERGE(tag, {
						aggregatedRating: {
							average: AVERAGE(cardTagRatings[*].value),
							count: LENGTH(cardTagRatings)
						},
						ratings: cardTagRatings,
						myRating: @userID != "" ? FIRST(
							FOR rating IN cardTagRatings
								FILTER rating.user._key == @userID
								RETURN rating
						) : {}
					})
				)
				RETURN MERGE(edge, {
					card: card,
					count: edge.count,
					mainOrSide: edge.mainOrSide,
					selectedVersionID: edge.selectedVersionID,
					aggregatedRating: {
						average: AVERAGE(ratings[*].value),
						count: LENGTH(ratings)
					},
					ratings: ratings,
					myRating: @userID != "" ? FIRST(
						FOR rating IN ratings
							FILTER rating.user._key == @userID
							RETURN rating
					) : {},
					cardTags: cardTags,
					deckTags: deckTags,
				})
			)

		RETURN MERGE(doc, {cards})
	`)

	col := arango.MTG_CARD_PACKAGES_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("@cardPackageEdge", arango.MTG_CARD_CARD_PACKAGE_EDGE)
	aq.AddBindVar("@userRatingEdge", arango.MTG_USER_RATING_EDGE_COLLECTION)
	aq.AddBindVar("@tagCardEdge", arango.MTG_TAG_EDGE_COLLECTION)

	// Safely get user ID from context with logging
	userID, ok := ctx.Value(ctxkeys.UserIDKey).(string)
	if !ok {
		log.Warn().
			Interface("user_id_value", ctx.Value(ctxkeys.UserIDKey)).
			Bool("type_assertion_ok", ok).
			Msg("GetMTGCardPackages: Failed to get user ID from context")
		// Use the default user ID if not present
		userID = util.USER_ID
	}
	log.Debug().
		Str("user_id", userID).
		Interface("bind_vars", aq.BindVars).
		Msg("GetMTGCardPackages: Setting user ID bind variable")

	// Set the user ID bind variable
	aq = aq.AddBindVar("userID", userID)

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
