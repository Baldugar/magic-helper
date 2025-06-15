package arango

import (
	"context"

	arangoDriver "github.com/arangodb/go-driver"
	"github.com/rs/zerolog/log"
)

func EnsureDatabaseIntegrity(ctx context.Context) {
	log.Info().Msgf("Ensuring database integrity")
	ensureDocumentCollections(ctx)
	ensureEdgeCollections(ctx)
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
	if collection == USERS_COLLECTION {
		// Check if we have user with ID = 1, if not create it
		exists, err := c.DocumentExists(ctx, "1")
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to check if user exists")
			return nil, err
		}
		if !exists {
			_, err := c.CreateDocument(ctx, map[string]interface{}{"_key": "1"})
			if err != nil {
				log.Fatal().Err(err).Msg("Failed to create user")
				return nil, err
			}
			log.Info().Msgf("Created user with ID 1")
		}
	}
	return c, nil
}

func ensureEdgeCollections(ctx context.Context) {
	for _, edge := range EDGE_COLLECTIONS {
		EnsureEdgeCollection(ctx, edge)
	}
}

func EnsureEdgeCollection(ctx context.Context, edge ArangoEdge) (arangoDriver.Collection, error) {
	log.Info().Msgf("Ensuring edge collection %s", edge)
	exists, err := DB.CollectionExists(ctx, string(edge))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to check if collection exists")
		return nil, err
	}
	if !exists {
		c, err := DB.CreateCollection(ctx, string(edge), &arangoDriver.CreateCollectionOptions{Type: arangoDriver.CollectionTypeEdge})
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create collection")
			return nil, err
		}
		log.Info().Msgf("Created edge collection %s", c.Name())
		return c, nil
	}
	c, err := DB.Collection(ctx, string(edge))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get collection")
		return nil, err
	}
	log.Info().Msgf("Edge collection %s already exists", c.Name())
	return c, nil
}
