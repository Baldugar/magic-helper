package daemons

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

func shouldDownloadStart(record string) (bool, error) {
	var appConfig model.MTGAApplicationConfig
	ctx := context.Background()

	col, err := arango.EnsureDocumentCollection(ctx, arango.APPLICATION_CONFIG_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error ensuring application config collection")
		return false, err
	}

	exists, err := col.DocumentExists(ctx, record)
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if document exists")
		return false, err
	}

	if exists {
		_, err := col.ReadDocument(ctx, record, &appConfig)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return false, err
		}

		log.Info().Msgf("Last time fetched: %v", appConfig.LastTimeFetched)

		// If we fetched sets in the last 24 hours, don't fetch again
		if util.Now() < appConfig.LastTimeFetched+24*60*60*1000 {
			log.Info().Msg("Already fetched sets in the last 24 hours")
			return false, nil
		} else {
			return true, nil
		}
	} else {
		appConfig = model.MTGAApplicationConfig{
			ID:              record,
			LastTimeFetched: 0,
		}
		_, err := col.CreateDocument(ctx, appConfig)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating document")
			return false, err
		}
		return true, nil
	}
}

func updateLastTimeFetched(record string) error {
	var appConfig model.MTGAApplicationConfig
	ctx := context.Background()

	col, err := arango.EnsureDocumentCollection(ctx, arango.APPLICATION_CONFIG_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error ensuring application config collection")
		return err
	}

	_, err = col.ReadDocument(ctx, record, &appConfig)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading document")
		return err
	}

	appConfig.LastTimeFetched = util.Now()

	_, err = col.UpdateDocument(ctx, record, appConfig)
	if err != nil {
		log.Error().Err(err).Msgf("Error updating document")
		return err
	}

	return nil
}
