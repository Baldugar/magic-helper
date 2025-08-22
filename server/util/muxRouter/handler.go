package muxRouter

import (
	"context"
	"encoding/json"
	"fmt"
	"magic-helper/settings"
	"magic-helper/util"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/rs/zerolog/log"
)

type ConfigSettings struct {
	Domain string `json:"domain"`
	Port   int    `json:"port"`
}

type contextKey string

const userIDKey contextKey = "USER_ID"

func configHandler(w http.ResponseWriter, r *http.Request) {
	s := settings.Current

	port, err := strconv.Atoi(s.HTTPListen)
	if err != nil {
		log.Error().Err(err).Msg("error parsing port")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
	configSetting := &ConfigSettings{
		Domain: s.Domain,
		Port:   port,
	}

	b, err := json.Marshal(configSetting)
	if err != nil {
		log.Error().Err(err).Msg("error parsing settings into config.js")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/javascript")
	fmt.Fprintf(w, "const __envConfig = %s;", string(b))
}

func Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Add the constant USER_ID to the context TODO: Get from session
		ctx := context.WithValue(r.Context(), userIDKey, util.USER_ID)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

func setHandler(w http.ResponseWriter, r *http.Request) {
	log.Info().Msg("Serving set image")
	setName := r.URL.Path[len("/set/"):]
	log.Info().Msgf("Set name: %v", setName)
	if setName == "" {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join("public", "images", "sets", setName+".svg")

	w.Header().Set("Content-Type", "image/svg+xml")

	http.ServeFile(w, r, filePath)
}
