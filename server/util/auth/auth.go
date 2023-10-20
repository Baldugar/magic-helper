package auth

import (
	"context"
	"fmt"
	"net/http"

	"github.com/rs/zerolog/log"
)

func getUserIDFromRequest(r *http.Request) *string {
	userIDHeader := r.Header.Get("X-User-ID")
	if userIDHeader == "" {
		return nil
	}
	return &userIDHeader
}

func validatePrivateRequest(r *http.Request) (*string, error) {
	log.Debug().Msgf("Validating request %v", r)
	userIDHeader := getUserIDFromRequest(r)
	if userIDHeader == nil {
		return nil, fmt.Errorf("No user ID header")
	}
	return userIDHeader, nil
}

func GetUserIDFromContext(ctx context.Context, private bool) *string {
	userID, ok := ctx.Value("userID").(*string)
	if !ok {
		if private {
			log.Error().Msgf("Failed to get user ID from context")
		}
		return nil
	}
	return userID
}

func AuthGraphQLPrivateHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, err := validatePrivateRequest(r)
		if err != nil {
			log.Error().Err(err).Msgf("Failed to validate private request")
			http.Error(w, "Failed to validate private request", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), "userID", userID)
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AuthGraphQLPublicHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromRequest(r)
		ctx := context.WithValue(r.Context(), "userID", userID)
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}
