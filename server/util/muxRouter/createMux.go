package muxRouter

import (
	"magic-helper/settings"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
)

func CreateMux(settings settings.Settings) *mux.Router {
	// Create a new mux router
	router := mux.NewRouter()

	// Create a new GraphQL server
	// graphQLServer := handler.NewDefaultServer(gentypes.NewExecutableSchema(gentypes.Config{Resolvers: &graph.Resolver{}}))

	if settings.GraphQLPlayground {
		router.Handle("/playground-admin", playground.Handler("GraphQL playground", "/graphql-admin"))
		router.Handle("/playground-private", playground.Handler("GraphQL playground", "/graphql-private"))
		router.Handle("/playground-public", playground.Handler("GraphQL playground", "/graphql-public"))
	}

	// router.Handle("/graphql-admin", auth.AuthGraphQLAdminHandler(graphQLServer))
	// router.Handle("/graphql-private", auth.AuthGraphQLPrivateHandler(graphQLServer))
	// router.Handle("/graphql-public", auth.AuthGraphQLPublicHandler(graphQLServer))

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
