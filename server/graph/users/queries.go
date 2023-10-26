package users

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// Get All Users
func GetUsersQuery(ctx context.Context) ([]*model.User, error) {
	log.Info().Msgf("GetUsersQuery: Started")
	aq := arango.NewQuery(`
		FOR u IN Users
		RETURN {
			id: u._key,
			username: u.username,
		}
	`)
	var users []*model.User
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying users")
		return nil, err
	}
	defer cursor.Close()
	for cursor.HasMore() {
		var user model.User
		_, err := cursor.ReadDocument(ctx, &user)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading user")
			return nil, err
		}
		users = append(users, &user)
	}
	log.Info().Msgf("GetUsersQuery: Finished")
	return users, nil
}

// Get User by ID
func GetUserByIDQuery(ctx context.Context, id string) (*model.User, error) {
	log.Info().Msgf("GetUserQuery: Started")
	aq := arango.NewQuery(`
		FOR u IN Users
		FILTER u._key == @id
		RETURN {
			id: u._key,
			username: u.username,
		}
	`)
	aq.AddBindVar("id", id)
	var user model.User
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying user")
		return nil, err
	}
	defer cursor.Close()
	_, err = cursor.ReadDocument(ctx, &user)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading user")
		return nil, err
	}
	log.Info().Msgf("GetUserQuery: Finished")
	return &user, nil
}

// Get User by Username
func GetUserByUsernameQuery(ctx context.Context, username string) (*model.User, error) {
	log.Info().Msgf("GetUserQuery: Started")
	aq := arango.NewQuery(`
		FOR u IN Users
		FILTER u.username == @username	
		RETURN {
			id: u._key,
			username: u.username,
		}
	`)
	aq.AddBindVar("username", username)
	var user model.User
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying user")
		return nil, err
	}
	defer cursor.Close()
	_, err = cursor.ReadDocument(ctx, &user)
	if err != nil {
		log.Error().Err(err).Msgf("Error reading user")
		return nil, err
	}
	log.Info().Msgf("GetUserQuery: Finished")
	return &user, nil
}
