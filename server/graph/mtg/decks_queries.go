package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// GetMTGDecks lists all decks with a front image preview and sorted card edges.
func GetMTGDecks(ctx context.Context) ([]*model.MtgDeckDashboard, error) {
	log.Info().Msg("GetMTGADecks: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN mtg_decks
			LET cardFrontImage = FIRST(
				FOR card, edge IN 1..1 OUTBOUND doc mtg_deck_front_image
					LET imageVersion = FIRST(
						FOR v IN card.versions
							FILTER v.ID == edge.versionID
							RETURN v
					)
					FILTER imageVersion != null
					RETURN {
						image: imageVersion.cardFaces != null && LENGTH(imageVersion.cardFaces) > 0 && imageVersion.cardFaces[0].imageUris != null 
						? imageVersion.cardFaces[0].imageUris 
						: imageVersion.imageUris,
						cardID: card.ID,
						versionID: imageVersion.ID
					}
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc mtg_card_deck
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

// GetMTGDeck fetches a single deck with full card details and tags.
func GetMTGDeck(ctx context.Context, deckID string) (*model.MtgDeck, error) {
	log.Info().Msg("GetMTGDeck: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN mtg_decks
			FILTER doc._key == @deckID			
			LET cardFrontImage = FIRST(
				FOR card, edge IN 1..1 OUTBOUND doc mtg_deck_front_image
					LET imageVersion = FIRST(
						FOR v IN card.versions
							FILTER v.ID == edge.versionID
							RETURN v
					)
					FILTER imageVersion != null
					RETURN {
						image: imageVersion.cardFaces != null && LENGTH(imageVersion.cardFaces) > 0 && imageVersion.cardFaces[0].imageUris != null 
						? imageVersion.cardFaces[0].imageUris 
						: imageVersion.imageUris,
						cardID: card.ID,
						versionID: imageVersion.ID
					}
			)
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc mtg_card_deck
				SORT edge.position.x ASC, edge.position.y ASC
				RETURN MERGE(edge, {					
					card,
					count: edge.count,
					position: edge.position,
					deckCardType: edge.deckCardType,
					phantoms: edge.phantoms
				})
			)
			LET ignoredCards = (
				FOR card, edge IN 1..1 OUTBOUND CONCAT("mtg_decks/", doc._key) mtg_deck_ignore_card
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
