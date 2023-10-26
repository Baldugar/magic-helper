package main

import (
	"flag"
	"magic-helper/arango"
	"magic-helper/arango/daemons"
	"magic-helper/settings"
	"magic-helper/util/logging"
	"magic-helper/util/muxRouter"
	"net/http"
	"runtime"
	"runtime/debug"
	"time"

	"github.com/rs/cors"
	"github.com/rs/zerolog/log"
)

type Flags = struct {
	settingsFile string
	listen       string
}

var flags Flags

func main() {

	// The server recovery function
	defer func() {
		r := recover()
		if r != nil {
			log.Error().Err(r.(error)).Bytes("stack", debug.Stack()).Msgf("Recovering panic")
		}
	}()

	// Parse flags
	parseFlags()

	// Load settings
	settings.Load(flags.settingsFile)

	// Configure logging
	logging.Configure(settings.Current)

	// Initialize ArangoDB
	arango.Init(settings.Current.ArangoDB)

	// Initialize the daemons
	go daemons.PeriodicFetchCards()

	// Start the server
	log.Info().Msgf("########## Magic Helper Server Startup ##########")
	log.Info().Msgf("########## running %v on %v CPUs ##########", runtime.Version(), runtime.NumCPU())

	router := muxRouter.CreateMux(settings.Current)
	var loggingRouter http.Handler
	loggingRouter = loggingHandler(router)

	if settings.Current.AllowCrossOrigin {
		c := cors.New(cors.Options{
			AllowedOrigins: []string{"*"},
			AllowedMethods: []string{
				http.MethodHead,
				http.MethodGet,
				http.MethodPost,
				http.MethodPut,
				http.MethodPatch,
				http.MethodDelete,
			},
			AllowedHeaders:   []string{"*"},
			AllowCredentials: true,
		})
		loggingRouter = c.Handler(loggingRouter)
	}

	log.Info().Msgf("########## listening on %v ##########", settings.Current.HTTPListen)
	srv := &http.Server{
		Addr: ":" + settings.Current.HTTPListen,
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout:      time.Duration(120) * time.Second,
		ReadTimeout:       time.Duration(120) * time.Second,
		ReadHeaderTimeout: time.Duration(40) * time.Second,
		Handler:           loggingRouter,
	}
	log.Fatal().Err(srv.ListenAndServe()).Msg("Failed to start server")
}

func parseFlags() {
	flag.StringVar(&flags.settingsFile, "settings", "", "Determines the file from which the settings are loaded.")
	flag.Parse()
}

func loggingHandler(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		t1 := time.Now()
		next.ServeHTTP(w, r)
		t2 := time.Now()
		log.Debug().Str("method", r.Method).Str("path", r.URL.String()).Msgf("request executed in %v", t2.Sub(t1))
	}
	return http.HandlerFunc(fn)
}
