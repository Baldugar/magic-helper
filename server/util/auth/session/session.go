package session

import (
	"magic-helper/util"

	"github.com/golang-jwt/jwt"
	"github.com/rs/zerolog/log"
)

// 1 hour in milliseconds
var sessionDuration int = 3600000

// The keys are the userIDs and the values are the JWT tokens
var activeSessions map[string]string = make(map[string]string)

func CreateSession(userID string) (string, error) {
	if session, ok := activeSessions[userID]; ok {
		log.Warn().Msg("Session already exists for user")
		return session, nil
	}
	timestamp := util.CreateTimestamp()
	token := *GenerateToken(userID, timestamp)
	activeSessions[userID] = token
	return token, nil
}

func GetSessionByUserID(userID string) *string {
	session, ok := activeSessions[userID]
	if ok {
		return &session
	}
	return nil
}

func RefreshSession(token string) *string {
	parsedToken, err := ParseToken(token)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse token")
		return nil
	}
	userID := parsedToken.Claims.(*Claims).UserID
	currentToken, ok := activeSessions[userID]
	if !ok {
		log.Error().Msg("No active session found for user")
		return nil
	}
	if currentToken != token {
		log.Error().Msg("Token does not match active session")
		return nil
	}
	if IsTokenExpired(parsedToken) {
		log.Error().Msg("Session is expired")
		return nil
	}

	newToken, err := CreateSession(userID)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create new session")
		return nil
	}

	return &newToken
}

func IsTokenExpired(token *jwt.Token) bool {
	currentTime := util.CreateTimestamp()
	return (currentTime - int(token.Claims.(*Claims).Timestamp)) > sessionDuration
}

func IsTokenValid(token string) bool {
	parsedToken, err := ParseToken(token)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse token")
		return false
	}
	userID := parsedToken.Claims.(*Claims).UserID
	currentToken, ok := activeSessions[userID]
	if !ok {
		log.Error().Msg("No active session found for user")
		return false
	}
	if currentToken != token {
		log.Error().Msg("Token does not match active session")
		return false
	}
	if IsTokenExpired(parsedToken) {
		log.Error().Msg("Session is expired")
		return false
	}
	return true
}

func PruneExpiredSessions() {
	for userID, token := range activeSessions {
		parsedToken, err := ParseToken(token)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to parse token")
			return
		}

		if IsTokenExpired(parsedToken) || !parsedToken.Valid {
			delete(activeSessions, userID)
		}
	}
}
