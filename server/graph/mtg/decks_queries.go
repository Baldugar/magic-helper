package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"magic-helper/util/ctxkeys"

	"github.com/rs/zerolog/log"
)

func GetMTGDecks(ctx context.Context, deckID *string) ([]*model.MtgDeck, error) {
	log.Info().Msg("GetMTGADecks: Started")

	// Debug logging for context
	log.Debug().
		Interface("context_keys", ctx.Value(ctxkeys.UserIDKey)).
		Msg("GetMTGDecks: Context debug")

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
					FILTER LENGTH(version) > 0
					RETURN MERGE(card, {
						versions: version,
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
						deckTags: deckTags
					})
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc @@edge2
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
				SORT edge.position.x ASC, edge.position.y ASC
				RETURN MERGE(edge, {					
					card: MERGE(card, {
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
						deckTags: deckTags
					}),
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
	aq.AddBindVar("@userRatingEdge", arango.MTG_USER_RATING_EDGE_COLLECTION)
	aq.AddBindVar("@tagCardEdge", arango.MTG_TAG_EDGE_COLLECTION)

	// Safely get user ID from context with logging
	userID, ok := ctx.Value(ctxkeys.UserIDKey).(string)
	if !ok {
		log.Warn().
			Interface("user_id_value", ctx.Value(ctxkeys.UserIDKey)).
			Bool("type_assertion_ok", ok).
			Msg("GetMTGDecks: Failed to get user ID from context")
		// Use the default user ID if not present
		userID = util.USER_ID
	}
	log.Debug().
		Str("user_id", userID).
		Interface("bind_vars", aq.BindVars).
		Msg("GetMTGDecks: Setting user ID bind variable")

	// Set the user ID bind variable
	aq = aq.AddBindVar("userID", userID)

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
