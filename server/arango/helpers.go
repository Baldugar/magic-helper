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
	ensureAnalyzers(ctx)
	ensureViews(ctx)
	ensureIndexes(ctx)
	log.Info().Msgf("Database integrity ensured")
}

func ensureDocumentCollections(ctx context.Context) {
	for _, collection := range DOCUMENT_COLLECTIONS {
		ensureDocumentCollection(ctx, collection)
	}
}

func ensureEdgeCollections(ctx context.Context) {
	for _, collection := range EDGE_COLLECTIONS {
		ensureEdgeCollection(ctx, collection)
	}
}

func ensureAnalyzers(ctx context.Context) {
	for _, analyzer := range ANALYZERS {
		ensureAnalyzer(ctx, analyzer)
	}
}

func ensureViews(ctx context.Context) {
	for _, view := range VIEWS {
		ensureView(ctx, view)
	}
}

func ensureIndexes(ctx context.Context) {
	for _, index := range INDEXES {
		ensureIndex(ctx, index)
	}
}

func ensureDocumentCollection(ctx context.Context, collection ArangoDocument) (arangoDriver.Collection, error) {
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
		if collection == USERS_COLLECTION {
			// Add the admin user
			log.Info().Msgf("Creating admin user")
			_, err := c.CreateDocument(ctx, map[string]interface{}{
				"username": "admin",
				"email":    "admin@magic-helper.com",
				"_key":     "admin",
			})
			if err != nil {
				log.Fatal().Err(err).Msg("Failed to create admin user")
				return nil, err
			}
		}
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

func ensureEdgeCollection(ctx context.Context, collection ArangoEdge) (arangoDriver.Collection, error) {
	log.Info().Msgf("Ensuring edge collection %s", collection)
	exists, err := DB.CollectionExists(ctx, string(collection))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to check if collection exists")
		return nil, err
	}
	if !exists {
		c, err := DB.CreateCollection(ctx, string(collection), &arangoDriver.CreateCollectionOptions{
			Type: arangoDriver.CollectionTypeEdge,
		})
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create collection")
		}
		log.Info().Msgf("Created edge collection %s", c.Name())
		return c, nil
	}
	c, err := DB.Collection(ctx, string(collection))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get collection")
		return nil, err
	}
	log.Info().Msgf("Edge collection %s already exists", c.Name())
	return c, nil
}

func ensureAnalyzer(ctx context.Context, analyzer arangoDriver.ArangoSearchAnalyzerDefinition) (arangoDriver.ArangoSearchAnalyzer, error) {
	log.Info().Msgf("Ensuring analyzer %s", analyzer.Name)
	exists, a, err := DB.EnsureAnalyzer(ctx, analyzer)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create analyzer")
		return nil, err
	}
	if !exists {
		log.Info().Msgf("Created analyzer %s", analyzer.Name)
	} else {
		log.Info().Msgf("Analyzer %s already exists", analyzer.Name)
	}
	return a, nil
}

func ensureView(ctx context.Context, view ViewComposition) (arangoDriver.View, error) {
	log.Info().Msgf("Ensuring view %s", view.View)
	exists, err := DB.ViewExists(ctx, string(view.View))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to check if view exists")
		return nil, err
	}
	if !exists {
		links := arangoDriver.ArangoSearchLinks{}

		for doc, prop := range view.DocumentLinks {
			links[string(doc)] = prop
		}
		v, err := DB.CreateArangoSearchView(ctx, string(view.View), &arangoDriver.ArangoSearchViewProperties{
			Links: links,
		})
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create view")
			return nil, err
		}
		log.Info().Msgf("Created view %s", view.View)
		return v, nil
	}
	v, err := DB.View(ctx, string(view.View))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get view")
		return nil, err
	}
	log.Info().Msgf("View %s already exists", v.Name())
	return v, nil
}

func ensureIndex(ctx context.Context, index IndexComposition) (arangoDriver.Index, error) {
	log.Info().Msgf("Ensuring index %s", index.Name)
	col, err := ensureDocumentCollection(ctx, index.Collection)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to ensure collection")
		return nil, err
	}
	i, exists, err := col.EnsurePersistentIndex(ctx, index.Fields, &arangoDriver.EnsurePersistentIndexOptions{
		Unique: index.Unique,
		Name:   string(index.Name),
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create index")
		return nil, err
	}
	if !exists {
		log.Info().Msgf("Created index %s", index.Name)
	} else {
		log.Info().Msgf("Index %s already exists", index.Name)
	}
	return i, nil
}
