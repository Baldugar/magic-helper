package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// Dashboard
func GetMTGDecks(ctx context.Context) ([]*model.MtgDeckDashboard, error) {
	log.Info().Msg("GetMTGADecks: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Decks
			LET cardFrontImage = FIRST(
				FOR card, edge IN 1..1 OUTBOUND doc MTG_Deck_Front_Card_Image
					LET imageVersion = FIRST(
						FOR v IN card.versions
							FILTER v.ID == edge.versionID
							RETURN v
					)
					FILTER imageVersion != null
					RETURN {
						image: imageVersion.cardFaces != null && LENGTH(imageVersion.cardFaces) > 0 && imageVersion.cardFaces[0].imageUris != null 
						? imageVersion.cardFaces[0].imageUris.artCrop 
						: imageVersion.imageUris.artCrop,
						cardID: card.ID,
						versionID: imageVersion.ID
					}
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc MTG_Card_Deck
				FILTER card != null
				SORT edge.position.x ASC, edge.position.y ASC
				RETURN MERGE(edge, {card})
			)
		RETURN MERGE(doc, {cardFrontImage, cards})
	`)

	log.Info().Str("query", aq.Query).Msg("GetMTGADecks: Querying database")

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGADecks: Error querying database")
		return nil, err
	}

	var decks []*model.MtgDeckDashboard
	defer cursor.Close()
	for cursor.HasMore() {
		var deck model.MtgDeckDashboard
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

func GetMTGDeck(ctx context.Context, deckID string) (*model.MtgDeck, error) {
	log.Info().Msg("GetMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Decks
			FILTER doc._key == @deckID			
			LET cardFrontImage = FIRST(
				FOR card, edge IN 1..1 OUTBOUND doc MTG_Deck_Front_Card_Image
					LET imageVersion = FIRST(
						FOR v IN card.versions
							FILTER v.ID == edge.versionID
							RETURN v
					)
					FILTER imageVersion != null
					RETURN {
						image: imageVersion.cardFaces != null && LENGTH(imageVersion.cardFaces) > 0 && imageVersion.cardFaces[0].imageUris != null 
						? imageVersion.cardFaces[0].imageUris.artCrop 
						: imageVersion.imageUris.artCrop,
						cardID: card.ID,
						versionID: imageVersion.ID
					}
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc MTG_Card_Deck
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
				SORT edge.position.x ASC, edge.position.y ASC
				RETURN MERGE(edge, {					
					card: MERGE(card, {
						myRating: rating,
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
			LET ignoredCards = (
				FOR card, edge IN 1..1 OUTBOUND CONCAT("MTG_Decks/", doc._key) MTG_Deck_Ignore_Card
				RETURN card._key
			)
		RETURN MERGE(doc, {cardFrontImage, cards, ignoredCards})
	`)

	aq.AddBindVar("deckID", deckID)

	log.Info().Str("query", aq.Query).Msg("GetMTGDeck: Querying database")

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGDeck: Error querying database")
		return nil, err
	}

	var deck model.MtgDeck
	_, err = cursor.ReadDocument(ctx, &deck)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGDeck: Error reading document")
		return nil, err
	}

	log.Info().Msg("GetMTGDeck: Finished")
	return &deck, nil
}
