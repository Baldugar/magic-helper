package muxRouter

import (
	"context"
	"magic-helper/graph"
	"magic-helper/graph/gentypes"
	"magic-helper/settings"
	"magic-helper/util"
	"magic-helper/util/ctxkeys"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

func CreateMux(settings settings.Settings) *mux.Router {
	// Create a new mux router
	router := mux.NewRouter()

	// Create a new GraphQL server
	graphQLServer := handler.New(gentypes.NewExecutableSchema(gentypes.Config{Resolvers: &graph.Resolver{}}))

	// Add middleware to copy user ID from request context to GraphQL context
	graphQLServer.Use(extension.FixedComplexityLimit(1000))
	graphQLServer.Use(extension.Introspection{})

	// Wrap the GraphQL handler to copy the user ID from the request context
	graphQLHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the user ID from the request context
		userID, ok := r.Context().Value(ctxkeys.UserIDKey).(string)
		if !ok {
			log.Warn().
				Interface("user_id_value", r.Context().Value(ctxkeys.UserIDKey)).
				Bool("type_assertion_ok", ok).
				Msg("GraphQL handler: Failed to get user ID from request context")
			// Use the default user ID if not present
			userID = util.USER_ID
		}
		// Create a new context with the user ID
		ctx := context.WithValue(r.Context(), ctxkeys.UserIDKey, userID)
		// Create a new request with the new context
		r = r.WithContext(ctx)
		log.Debug().
			Str("user_id", userID).
			Msg("GraphQL handler: Setting user ID in context")
		graphQLServer.ServeHTTP(w, r)
	})

	graphQLServer.AddTransport(transport.Options{})
	graphQLServer.AddTransport(transport.GET{})
	graphQLServer.AddTransport(transport.POST{})

	if settings.GraphQLPlayground {
		router.Handle("/playground", playground.Handler("GraphQL playground", "/graphql"))
	}

	router.HandleFunc("/config.js", configHandler)

	// Serve the set images
	router.HandleFunc("/set/{code}", setHandler)

	// router.Handle("/graphql-admin", auth.AuthGraphQLAdminHandler(graphQLServer))
	// router.Handle("/graphql-private", auth.AuthGraphQLPrivateHandler(graphQLServer))
	router.Handle("/graphql", graphQLHandler)

	website := http.FileServer(HTMLDir{http.Dir("./website")})
	router.PathPrefix("/").Handler(website)
	return router
}

type HTMLDir struct {
	d http.Dir
}

func (d HTMLDir) Open(name string) (http.File, error) {
	// Try name as supplied
	f, err := d.d.Open(name)
	if os.IsNotExist(err) {
		// Not found, try with .html
		if f, err := d.d.Open(name + ".html"); err == nil {
			return f, nil
		}
	}
	return f, err
}
