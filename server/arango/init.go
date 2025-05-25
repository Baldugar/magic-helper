package arango

import (
	"context"
	"fmt"
	"magic-helper/settings"
	"time"

	arangoDriver "github.com/arangodb/go-driver"
	arangoHttp "github.com/arangodb/go-driver/http"
	"github.com/rs/zerolog/log"
)

var DB arangoDriver.Database

func Init(settings settings.ArangoDBConfig) {
	ctx := context.Background()

	arangoEndPoints := fmt.Sprintf("http://%s:%s", settings.Addr, settings.Port)

	log.Info().Msgf("Initializing ArangoDB connection to %s", arangoEndPoints)
	conn, err := arangoHttp.NewConnection(arangoHttp.ConnectionConfig{
		Endpoints: []string{arangoEndPoints},
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create connection")
	}
	log.Info().Msgf("ArangoDB connection created")
	arangoClient, err := arangoDriver.NewClient(arangoDriver.ClientConfig{
		Connection:     conn,
		Authentication: arangoDriver.BasicAuthentication(settings.User, settings.Password),
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create client")
	}
	log.Info().Msgf("ArangoDB client created")
	log.Info().Msgf("Ensuring database %s", settings.Name)

	var dbExists bool
	for i := 0; i < 5; i++ {
		DB, err = arangoClient.Database(ctx, settings.Name)
		if err != nil {
			if arangoDriver.IsNotFoundGeneral(err) {
				log.Info().Msgf("Database %s not found, creating (attempt %d/5)", settings.Name, i+1)
				DB, err = arangoClient.CreateDatabase(ctx, settings.Name, nil)
				if err != nil {
					log.Error().Err(err).Msgf("Failed to create database %s (attempt %d/5)", settings.Name, i+1)
				} else {
					log.Info().Msgf("Database %s created successfully", settings.Name)
					dbExists = true
					break
				}
			} else {
				log.Error().Err(err).Msgf("Failed to get database %s (attempt %d/5)", settings.Name, i+1)
			}
		} else {
			log.Info().Msgf("Database %s found successfully", settings.Name)
			dbExists = true
			break
		}

		if i < 4 {
			log.Info().Msgf("Retrying in 10 seconds...")
			time.Sleep(10 * time.Second)
		}
	}

	if !dbExists {
		log.Fatal().Msgf("Failed to connect to or create database %s after 5 attempts", settings.Name)
	}

	EnsureDatabaseIntegrity(ctx)
}
