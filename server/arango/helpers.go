package arango

import (
	"context"

	arangoDriver "github.com/arangodb/go-driver"
	"github.com/rs/zerolog/log"
)

func EnsureDatabaseIntegrity(ctx context.Context) {
	log.Info().Msgf("Ensuring database integrity")
	ensureDocumentCollections(ctx)
	log.Info().Msgf("Database integrity ensured")
}

func ensureDocumentCollections(ctx context.Context) {
	for _, collection := range DOCUMENT_COLLECTIONS {
		EnsureDocumentCollection(ctx, collection)
	}
}

func EnsureDocumentCollection(ctx context.Context, collection ArangoDocument) (arangoDriver.Collection, error) {
	log.Info().Msgf("Ensuring document collection %s", collection)
	exists, err := DB.CollectionExists(ctx, string(collection))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to check if collection exists")
		return nil, err
	}
	if !exists {
		c, err := DB.CreateCollection(ctx, string(collection), &arangoDriver.CreateCollectionOptions{})
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create collection")
			return nil, err
		}
		log.Info().Msgf("Created document collection %s", c.Name())
		return c, nil
	}
	c, err := DB.Collection(ctx, string(collection))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get collection")
		return nil, err
	}
	log.Info().Msgf("Document collection %s already exists", c.Name())
	return c, nil
}
