package auth

import (
	"context"
	"magic-helper/graph/users"
	"magic-helper/util/auth/session"
	"net/http"

	"github.com/golang-jwt/jwt"
	"github.com/rs/zerolog/log"
)

func GetUserIDFromRequest(r *http.Request) *string {
	token := r.Header.Get("X-Token")
	if token == "" {
		return nil
	}
	parsedToken, err := session.ParseToken(token)
	if err != nil {
		log.Error().Err(err).Msgf("Failed to parse token")
		return nil
	}
	userID := parsedToken.Claims.(*session.Claims).UserID
	return &userID
}

func GetTokenFromRequest(r *http.Request) *string {
	token := r.Header.Get("X-Token")
	if token == "" {
		return nil
	}
	return &token
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

func GetUserIDFromToken(token *jwt.Token) *string {
	userID := token.Claims.(*session.Claims).UserID
	return &userID
}

func AuthGraphQLPrivateHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rawToken := GetTokenFromRequest(r)
		if rawToken == nil {
			log.Error().Msgf("Failed to get token from request")
			http.Error(w, "You shall not pass", http.StatusUnauthorized)
			return
		}
		token, err := session.ParseToken(*rawToken)
		if err != nil {
			log.Error().Err(err).Msgf("Failed to parse token")
			http.Error(w, "You shall not pass", http.StatusUnauthorized)
			return
		}
		if session.IsTokenExpired(token) {
			log.Warn().Msgf("Token is expired")
			newToken := session.RefreshSession(*rawToken)
			if newToken == nil {
				log.Fatal().Msgf("Failed to refresh session")
				http.Error(w, "You shall not pass", http.StatusUnauthorized)
				return
			}

			w.Header().Set("New-Token", *newToken)
			token, err = session.ParseToken(*newToken)
			if err != nil {
				log.Error().Err(err).Msgf("Failed to parse token")
				http.Error(w, "You shall not pass", http.StatusUnauthorized)
				return
			}
		} else if !session.IsTokenValid(*rawToken) {
			log.Error().Msgf("Token is not valid")
			http.Error(w, "You shall not pass", http.StatusUnauthorized)
			return
		}

		userID := GetUserIDFromToken(token)
		if userID == nil {
			log.Error().Msgf("Failed to get user ID from token")
			http.Error(w, "You shall not pass", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "userID", userID)
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AuthGraphQLAdminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rawToken := GetTokenFromRequest(r)
		if rawToken == nil {
			log.Error().Msgf("Failed to get token from request")
			http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
			return
		}
		token, err := session.ParseToken(*rawToken)
		if err != nil {
			log.Error().Err(err).Msgf("Failed to parse token")
			http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
			return
		}
		if session.IsTokenExpired(token) {
			log.Warn().Msgf("Admin Token is expired")
			newToken := session.RefreshSession(*rawToken)
			if newToken == nil {
				log.Fatal().Msgf("Failed to refresh session")
				http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
				return
			}

			w.Header().Set("New-Token", *newToken)
			token, err = session.ParseToken(*newToken)
			if err != nil {
				log.Error().Err(err).Msgf("Failed to parse token")
				http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
				return
			}
		} else if !session.IsTokenValid(*rawToken) {
			log.Error().Msgf("Token is not valid")
			http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
			return
		}

		userID := GetUserIDFromToken(token)
		if userID == nil {
			log.Error().Msgf("Failed to get user ID from token")
			http.Error(w, "Trespassers will be shot at", http.StatusUnauthorized)
			return
		}

		_, err = users.GetUserByIDQuery(context.Background(), *userID)
		if err != nil {
			log.Error().Msgf("Couldn't get user from database")

		}

		ctx := context.WithValue(r.Context(), "userID", userID)
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AuthGraphQLPublicHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserIDFromRequest(r)
		ctx := context.WithValue(r.Context(), "userID", userID)
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}
