package mtg

import (
	"context"
	"errors"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func CreateMTGCardPackage(ctx context.Context, input model.MtgCreateCardPackageInput) (*model.Response, error) {
	log.Info().Msgf("CreateMTGCardPackage: Started")

	aq := arango.NewQuery( /* aql */ `
		INSERT {
			name: @name
		} INTO MTG_Card_Packages
		RETURN NEW
	`)

	aq.AddBindVar("name", input.Name)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("CreateMTGCardPackage: Error inserting card package")
		errMsg := err.Error()
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	var cardPackage model.MtgCardPackage
	defer cursor.Close()
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &cardPackage)
		if err != nil {
			log.Error().Err(err).Msgf("CreateMTGCardPackage: Error reading document")
			errMsg := err.Error()
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, err
		}
	}

	log.Info().Msgf("CreateMTGCardPackage: Inserted card package")

	return &model.Response{
		Status:  true,
		Message: &cardPackage.ID,
	}, nil
}

func DeleteMTGCardPackage(ctx context.Context, input model.MtgDeleteCardPackageInput) (*model.Response, error) {
	log.Info().Msgf("DeleteMTGCardPackage: Started")

	aq := arango.NewQuery( /* aql */ `
		REMOVE {
			_key: @cardPackageID
		} IN MTG_Card_Packages
	`)

	aq.AddBindVar("cardPackageID", input.CardPackageID)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("DeleteMTGCardPackage: Error deleting card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	// Delete all cards in card package
	aq = arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Card_Card_Package
		FILTER doc._to == CONCAT("MTG_Card_Packages/", @cardPackageID)
		REMOVE doc IN MTG_Card_Card_Package
	`)

	aq.AddBindVar("cardPackageID", input.CardPackageID)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("DeleteMTGCardPackage: Error deleting cards in card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	log.Info().Msgf("DeleteMTGCardPackage: Deleted card package")

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func AddMTGCardToCardPackage(ctx context.Context, input model.MtgAddCardToCardPackageInput) (*model.Response, error) {
	log.Info().Msgf("AddMTGCardToCardPackage: Started")

	// Check if card package exists
	cardPackages, err := GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("AddMTGCardToCardPackage: Error getting card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	if len(cardPackages) == 0 {
		errMsg := "Card package not found"
		log.Error().Msgf("AddMTGCardToCardPackage: Card package not found")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, errors.New(errMsg)
	}

	cardPackage := cardPackages[0]

	// Check if card is already in card package
	for _, card := range cardPackage.Cards {
		if card.Card.ID == input.Card {
			errMsg := "Card already in card package"
			log.Error().Msgf("AddMTGCardToCardPackage: Card already in card package")
			return &model.Response{
				Status:  false,
				Message: &errMsg,
			}, errors.New(errMsg)
		}
	}

	// Add card to card package
	aq := arango.NewQuery( /* aql */ `
		INSERT {
			_from: CONCAT("MTG_Cards/", @cardID),
			_to: CONCAT("MTG_Card_Packages/", @cardPackageID),
			count: 1
		} IN MTG_Card_Card_Package
	`)

	aq.AddBindVar("cardID", input.Card)
	aq.AddBindVar("cardPackageID", input.CardPackageID)
	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("AddMTGCardToCardPackage: Error adding card to card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}

func RemoveMTGCardFromCardPackage(ctx context.Context, input model.MtgRemoveCardFromCardPackageInput) (*model.Response, error) {
	log.Info().Msgf("RemoveMTGCardFromCardPackage: Started")

	// Check if card package exists
	cardPackages, err := GetMTGCardPackages(ctx, &input.CardPackageID)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("RemoveMTGCardFromCardPackage: Error getting card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	if len(cardPackages) == 0 {
		errMsg := "Card package not found"
		log.Error().Msgf("RemoveMTGCardFromCardPackage: Card package not found")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, errors.New(errMsg)
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
		errMsg := "Card not found in card package"
		log.Error().Msgf("RemoveMTGCardFromCardPackage: Card not found in card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, errors.New(errMsg)
	}

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Card_Card_Package
		FILTER doc._from == CONCAT("MTG_Cards/", @cardID)
		FILTER doc._to == CONCAT("MTG_Card_Packages/", @cardPackageID)
		REMOVE doc IN MTG_Card_Card_Package
	`)

	aq.AddBindVar("cardID", input.Card)
	aq.AddBindVar("cardPackageID", input.CardPackageID)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		errMsg := err.Error()
		log.Error().Err(err).Msgf("RemoveMTGCardFromCardPackage: Error removing card from card package")
		return &model.Response{
			Status:  false,
			Message: &errMsg,
		}, err
	}

	return &model.Response{
		Status:  true,
		Message: nil,
	}, nil
}
