package users

import (
	"context"
	"magic-helper/arango"
	"magic-helper/arango/types"
	"magic-helper/graph/model"
	"magic-helper/util"
	"magic-helper/util/auth/password"

	"github.com/rs/zerolog/log"
)

var activeSessions map[string]int = make(map[string]int)

// Create a new user.
// First check if the user already exists.
// If not, create the user.
func RegisterMutation(ctx context.Context, input model.RegisterInput) (*model.RegisterReturn, error) {
	log.Info().Msgf("CreateUserMutation: Started")
	// Check if user already exists
	user, err := GetUserByUsernameQuery(ctx, input.Username)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying user")
		msg := "Error querying user"
		return &model.RegisterReturn{
			Status:  false,
			Message: &msg,
			User:    nil,
		}, err
	}
	if user != nil {
		log.Info().Msgf("User already exists")
		return &model.RegisterReturn{
			Status:  false,
			Message: nil,
			User:    user,
		}, nil
	}
	// Create user
	ID := util.UUID4()
	now := util.CreateTimestamp()
	password, err := password.HashPassword(input.Password)
	if err != nil {
		log.Error().Err(err).Msgf("Error hashing password")
		msg := "Error encrypting password, please try again later"
		return &model.RegisterReturn{
			Status:  false,
			Message: &msg,
			User:    nil,
		}, err
	}
	newUser := &types.UserDB{
		Username:       input.Username,
		HashedPassword: password,
		ID:             ID,
		CreatedAt:      now,
		UpdatedAt:      now,
		DeletedAt:      nil,
		Roles: []model.Role{
			model.RolePlayer,
		},
	}
	collection, err := arango.EnsureDocumentCollection(ctx, arango.USERS_COLLECTION)
	if err != nil {
		log.Error().Err(err).Msgf("Error ensuring document collection")
		return nil, err
	}
	_, err = collection.CreateDocument(ctx, newUser)
	log.Info().Msgf("CreateUserMutation: Finished")

	return &model.RegisterReturn{
		Status:  true,
		Message: nil,
		User: &model.User{
			ID:       newUser.ID,
			Username: newUser.Username,
			Roles:    newUser.Roles,
		},
	}, nil
}
