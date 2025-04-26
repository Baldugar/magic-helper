package mtg

import (
	"context"
	"errors"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateMTGCardPackage(ctx context.Context, input model.MtgCreateCardPackageInput) (*model.MtgCardPackage, error) {
	log.Info().Msgf("CreateMTGCardPackage: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			name: @name
		} INTO @@collection
		RETURN NEW
	`)

	col := arango.MTG_CARD_PACKAGES_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("name", input.Name)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGCardPackage: Error inserting card package")
		return nil, err
	}

	var cardPackage model.MtgCardPackage
	defer cursor.Close()
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &cardPackage)
		if err != nil {
			log.Error().Err(err).Msgf("CreateMTGCardPackage: Error reading document")
			return nil, err
		}
	}

	log.Info().Msgf("CreateMTGCardPackage: Inserted card package")

	return &cardPackage, nil
}

func DeleteMTGCardPackage(ctx context.Context, input model.MtgDeleteCardPackageInput) (bool, error) {
	log.Info().Msgf("DeleteMTGCardPackage: Started")

	aq := arango.NewQuery( /* aql */ `
		REMOVE {
			_key: @cardPackageID
		} IN @@collection
	`)

	col := arango.MTG_CARD_PACKAGES_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("cardPackageID", input.CardPackageID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("DeleteMTGCardPackage: Error deleting card package")
		return false, err
	}

	// Delete all cards in card package
	aq = arango.NewQuery( /* aql */ `
		FOR doc IN @@edge
		FILTER doc._to == CONCAT("MTG_Card_Packages/", @cardPackageID)
		REMOVE doc IN @@edge
	`)

	aq.AddBindVar("cardPackageID", input.CardPackageID)
	aq.AddBindVar("@edge", arango.MTG_CARD_CARD_PACKAGE_EDGE)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("DeleteMTGCardPackage: Error deleting cards in card package")
		return false, err
	}

	log.Info().Msgf("DeleteMTGCardPackage: Deleted card package")

	return true, nil
}

func AddMTGCardToCardPackage(ctx context.Context, input model.MtgAddCardToCardPackageInput) (*model.MtgCardPackage, error) {
	log.Info().Msgf("AddMTGCardToCardPackage: Started")

	// Check if card package exists
	cardPackages, err := GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		log.Error().Err(err).Msgf("AddMTGCardToCardPackage: Error getting card package")
		return nil, err
	}

	if len(cardPackages) == 0 {
		log.Error().Msgf("AddMTGCardToCardPackage: Card package not found")
		return nil, errors.New("card package not found")
	}

	cardPackage := cardPackages[0]

	// Check if card is already in card package
	for _, card := range cardPackage.Cards {
		if card.Card.ID == input.Card {
			log.Error().Msgf("AddMTGCardToCardPackage: Card already in card package")
			return nil, errors.New("card already in card package")
		}
	}

	// Add card to card package
	aq := arango.NewQuery( /* aql */ `
		INSERT {
			_from: CONCAT("MTG_Cards/", @cardID),
			_to: CONCAT("MTG_Card_Packages/", @cardPackageID),
			count: 1
		} IN @@edge
	`)

	aq.AddBindVar("cardID", input.Card)
	aq.AddBindVar("cardPackageID", input.CardPackageID)
	aq.AddBindVar("@edge", arango.MTG_CARD_CARD_PACKAGE_EDGE)
	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("AddMTGCardToCardPackage: Error adding card to card package")
		return nil, err
	}

	cardPackages, err = GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		log.Error().Err(err).Msgf("AddMTGCardToCardPackage: Error getting card package")
		return nil, err
	}

	return cardPackages[0], nil
}

func RemoveMTGCardFromCardPackage(ctx context.Context, input model.MtgRemoveCardFromCardPackageInput) (*model.MtgCardPackage, error) {
	log.Info().Msgf("RemoveMTGCardFromCardPackage: Started")

	// Check if card package exists
	cardPackages, err := GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		log.Error().Err(err).Msgf("RemoveMTGCardFromCardPackage: Error getting card package")
		return nil, err
	}

	if len(cardPackages) == 0 {
		log.Error().Msgf("RemoveMTGCardFromCardPackage: Card package not found")
		return nil, errors.New("card package not found")
	}

	cardPackage := cardPackages[0]

	// Check if card is in card package
	cardFound := false
	for _, card := range cardPackage.Cards {
		if card.Card.ID == input.Card {
			log.Info().Msgf("RemoveMTGCardFromCardPackage: Card found in card package")
			cardFound = true
			break
		}
	}

	if !cardFound {
		log.Error().Msgf("RemoveMTGCardFromCardPackage: Card not found in card package")
		return nil, errors.New("card not found in card package")
	}

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@edge
		FILTER doc._from == CONCAT("MTG_Cards/", @cardID)
		FILTER doc._to == CONCAT("MTG_Card_Packages/", @cardPackageID)
		REMOVE doc IN @@edge
	`)

	aq.AddBindVar("cardID", input.Card)
	aq.AddBindVar("cardPackageID", input.CardPackageID)
	aq.AddBindVar("@edge", arango.MTG_CARD_CARD_PACKAGE_EDGE)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("RemoveMTGCardFromCardPackage: Error removing card from card package")
		return nil, err
	}

	cardPackages, err = GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		log.Error().Err(err).Msgf("RemoveMTGCardFromCardPackage: Error getting card package")
		return nil, err
	}

	return cardPackages[0], nil
}
