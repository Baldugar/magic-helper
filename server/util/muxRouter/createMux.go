package muxRouter

import (
	"magic-helper/graph"
	"magic-helper/graph/gentypes"
	"magic-helper/settings"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
)

func CreateMux(settings settings.Settings) *mux.Router {
	// Create a new mux router
	router := mux.NewRouter()

	// Create a new GraphQL server
	graphQLServer := handler.NewDefaultServer(gentypes.NewExecutableSchema(gentypes.Config{Resolvers: &graph.Resolver{}}))

	if settings.GraphQLPlayground {
		router.Handle("/playground", playground.Handler("GraphQL playground", "/graphql"))
	}

	router.HandleFunc("/config.js", configHandler)

	// Serve the set images
	router.HandleFunc("/set/{code}", setHandler)

	// router.Handle("/graphql-admin", auth.AuthGraphQLAdminHandler(graphQLServer))
	// router.Handle("/graphql-private", auth.AuthGraphQLPrivateHandler(graphQLServer))
	router.Handle("/graphql", Handler(graphQLServer))

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
