package arango

import (
	"context"
	"sync/atomic"

	arangoDriver "github.com/arangodb/go-driver"
	"github.com/rs/zerolog/log"
)

var integrityEnsured atomic.Bool

// EnsureDatabaseIntegrity guarantees that all required collections and indexes
// exist in the configured ArangoDB database. Safe to call multiple times.
func EnsureDatabaseIntegrity(ctx context.Context) {
	log.Info().Msgf("Ensuring database integrity")
	ensureDocumentCollections(ctx)
	ensureEdgeCollections(ctx)
	ensureIndexes(ctx)
	ensureGraphs(ctx)
	integrityEnsured.Store(true)
	log.Info().Msgf("Database integrity ensured")
}

// ensureDocumentCollections ensures presence of all document collections.
func ensureDocumentCollections(ctx context.Context) {
	for _, collection := range DOCUMENT_COLLECTIONS_ARRAY {
		EnsureDocumentCollection(ctx, collection)
	}
}

// EnsureDocumentCollection ensures that a document collection exists and returns it
func EnsureDocumentCollection(ctx context.Context, collection ArangoDocument) (arangoDriver.Collection, error) {
	if !integrityEnsured.Load() {
		log.Debug().Msgf("Ensuring document collection %s", collection)
		exists, err := DB.CollectionExists(ctx, collection.String())
		if err != nil {
			log.Fatal().Err(err).Msgf("Failed to check if document collection %s exists", collection)
			return nil, err
		}
		if !exists {
			log.Info().Msgf("Creating document collection %s", collection)
			col, err := DB.CreateCollection(ctx, collection.String(), nil)
			if err != nil {
				log.Fatal().Err(err).Msgf("Failed to create document collection %s", collection)
			}
			return col, nil
		}
		log.Debug().Msgf("Document collection %s exists", collection)
	}
	return DB.Collection(ctx, collection.String())
}

// ensureEdgeCollections ensures presence of all edge collections.
func ensureEdgeCollections(ctx context.Context) {
	for _, edge := range EDGE_COLLECTIONS_ARRAY {
		EnsureEdgeCollection(ctx, edge)
	}
}

// EnsureEdgeCollection ensures that an edge collection exists and returns it
func EnsureEdgeCollection(ctx context.Context, collection ArangoEdge) (arangoDriver.Collection, error) {
	if !integrityEnsured.Load() {
		log.Debug().Msgf("Ensuring edge collection %s", collection)
		exists, err := DB.CollectionExists(ctx, collection.String())
		if err != nil {
			log.Fatal().Err(err).Msgf("Failed to check if edge collection %s exists", collection)
			return nil, err
		}
		if !exists {
			log.Info().Msgf("Creating edge collection %s", collection)
			return DB.CreateCollection(ctx, collection.String(), &arangoDriver.CreateCollectionOptions{Type: arangoDriver.CollectionTypeEdge})
		}
		log.Debug().Msgf("Edge collection %s exists", collection)
	}
	return DB.Collection(ctx, collection.String())
}

// ensureIndexes ensures all configured persistent indexes are present.
func ensureIndexes(ctx context.Context) {
	for _, index := range INDEX_ARRAY {
		EnsureIndex(ctx, index)
	}
}

// EnsureIndex ensures that an index exists and returns it
func EnsureIndex(ctx context.Context, index ArangoIndexStruct) error {
	log.Info().Msgf("Ensuring index %s", index.Options.Name)

	collection, err := EnsureCollection(ctx, index.CollectionName, index.IsEdge)
	if err != nil {
		log.Fatal().Err(err).Msgf("Ensuring index %s: failed to ensure collection", index.Options.Name)
		return err
	}

	_, _, err = collection.EnsurePersistentIndex(ctx, index.Fields, index.Options)
	if err != nil {
		log.Fatal().Err(err).Msgf("Ensuring index %s: failed to ensure persistent index", index.Options.Name)
		return err
	}
	return nil
}

// EnsureCollection ensures that a collection exists and returns it
func EnsureCollection(ctx context.Context, name string, isEdgeCollection bool) (arangoDriver.Collection, error) {
	if isEdgeCollection {
		return EnsureEdgeCollection(ctx, ArangoEdge(name))
	}
	return EnsureDocumentCollection(ctx, ArangoDocument(name))
}

func ensureGraphs(ctx context.Context) {
	for graphName, graph := range GRAPH_ARRAY {
		EnsureGraph(ctx, graphName.String(), graph)
	}
}

func EnsureGraph(ctx context.Context, graphName string, graph arangoDriver.CreateGraphOptions) (arangoDriver.Graph, error) {
	log.Info().Msgf("Ensuring graph %s", graphName)
	exists, err := DB.GraphExists(ctx, graphName)
	if err != nil {
		log.Fatal().Err(err).Msgf("Ensuring graph %s: failed to check if graph exists", graphName)
		return nil, err
	}
	if !exists {
		graph, err := DB.CreateGraphV2(ctx, graphName, &graph)
		if err != nil {
			log.Fatal().Err(err).Msgf("Ensuring graph %s: failed to create graph", graphName)
			return nil, err
		}
		log.Info().Msgf("Graph %s created", graphName)
		return graph, nil
	}
	return DB.Graph(ctx, graphName)
}
