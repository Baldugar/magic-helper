package session

import (
	"magic-helper/settings"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/rs/zerolog/log"
)

type Claims struct {
	UserID    string `json:"userID"`
	Timestamp int64  `json:"timestamp"`
	jwt.StandardClaims
}

func GenerateToken(userID string, timestamp int) *string {
	expirationTime := time.Now().Add(1 * time.Hour)

	claims := &Claims{
		UserID:    userID,
		Timestamp: int64(timestamp),
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	stringSignedToken, err := token.SignedString([]byte(settings.Current.Auth.JWTSecret))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to sign token")
		return nil
	}

	return &stringSignedToken
}

func ParseToken(tokenString string) (*jwt.Token, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return settings.Current.Auth.JWTSecret, nil
	})

	if err != nil {
		return nil, err
	}

	return token, nil
}
