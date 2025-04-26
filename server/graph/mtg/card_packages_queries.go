package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func GetMTGCardPackages(ctx context.Context, cardPackageID *string) ([]*model.MtgCardPackage, error) {
	log.Info().Msg("GetMTGCardPackages: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
			// single: FILTER doc._key == @cardPackageID
			LET cards = (
				FOR card, edge IN 1..1 INBOUND doc @@edge
				RETURN MERGE(edge, {
					card: card,
					count: edge.count,
					mainOrSide: edge.mainOrSide,
					selectedVersionID: edge.selectedVersionID,
				})
			)

		RETURN MERGE(doc, {cards})
	`)

	col := arango.MTG_CARD_PACKAGES_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("@edge", arango.MTG_CARD_CARD_PACKAGE_EDGE)
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
