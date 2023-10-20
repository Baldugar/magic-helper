package arango

import (
	"context"
	"fmt"
	"magic-helper/settings"

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
	DB, err = arangoClient.Database(ctx, settings.Name)
	if err != nil && err.Error() == "database not found" {
		log.Info().Msgf("Database %s not found, creating", settings.Name)
		DB, err = arangoClient.CreateDatabase(ctx, settings.Name, nil)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create database")
		}
		log.Info().Msgf("Database %s created", settings.Name)
	} else if err != nil {
		log.Fatal().Err(err).Msg("Failed to get database")
	}
	log.Info().Msgf("Database %s found", settings.Name)
	EnsureDatabaseIntegrity(ctx)
}
