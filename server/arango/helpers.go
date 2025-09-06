package arango

import (
	"context"

	arangoDriver "github.com/arangodb/go-driver"
	"github.com/rs/zerolog/log"
)

// EnsureDatabaseIntegrity guarantees that all required collections and indexes
// exist in the configured ArangoDB database. Safe to call multiple times.
func EnsureDatabaseIntegrity(ctx context.Context) {
	log.Info().Msgf("Ensuring database integrity")
	ensureDocumentCollections(ctx)
	ensureEdgeCollections(ctx)
	ensureIndexes(ctx)
	log.Info().Msgf("Database integrity ensured")
}

// ensureDocumentCollections ensures presence of all document collections.
func ensureDocumentCollections(ctx context.Context) {
	for _, collection := range DOCUMENT_COLLECTIONS {
		EnsureDocumentCollection(ctx, collection)
	}
}

// EnsureDocumentCollection ensures the document collection exists and returns it.
// Special case: for USERS_COLLECTION, it also ensures a bootstrap doc with key "USER_ID".
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
	// Special case: for USERS_COLLECTION, it also ensures a bootstrap doc with key "USER_ID".
	// #TODO: Remove this once we have a proper way to create users
	if collection == USERS_COLLECTION {
		// Check if we have user with ID = USER_ID, if not create it
		exists, err := c.DocumentExists(ctx, "USER_ID")
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to check if user exists")
			return nil, err
		}
		if !exists {
			_, err := c.CreateDocument(ctx, map[string]interface{}{"_key": "USER_ID"})
			if err != nil {
				log.Fatal().Err(err).Msg("Failed to create user")
				return nil, err
			}
			log.Info().Msgf("Created user with ID USER_ID")
		}
	}
	return c, nil
}

// ensureEdgeCollections ensures presence of all edge collections.
func ensureEdgeCollections(ctx context.Context) {
	for _, edge := range EDGE_COLLECTIONS {
		EnsureEdgeCollection(ctx, edge)
	}
}

// EnsureEdgeCollection ensures the edge collection exists and returns it.
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

// ensureIndexes ensures all configured persistent indexes are present.
func ensureIndexes(ctx context.Context) {
	for _, index := range INDEX_ARRAY {
		EnsureIndex(ctx, index)
	}
}

// EnsureIndex ensures a persistent index exists on the target collection.
// It determines whether the collection is a document or edge type based on the index definition.
func EnsureIndex(ctx context.Context, index ArangoIndexStruct) error {
	log.Info().Msgf("Ensuring index %s", index.Options.Name)
	if index.IsEdge {
		col, err := EnsureEdgeCollection(ctx, ArangoEdge(index.CollectionName))
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to ensure edge collection")
			return err
		}

		_, _, err = col.EnsurePersistentIndex(ctx, index.Fields, index.Options)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to ensure persistent index")
			return err
		}
	} else {
		col, err := EnsureDocumentCollection(ctx, ArangoDocument(index.CollectionName))
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to ensure document collection")
			return err
		}
		_, _, err = col.EnsurePersistentIndex(ctx, index.Fields, index.Options)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to ensure persistent index")
			return err
		}
	}
	return nil
}
