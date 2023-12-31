package graph

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.39

import (
	"context"
	"fmt"
	"magic-helper/graph/gentypes"
	"magic-helper/graph/model"
)

// CreateUser is the resolver for the createUser field.
func (r *mutationResolver) CreateUser(ctx context.Context, input model.CreateUserInput) (*model.CreateUserReturn, error) {
	panic(fmt.Errorf("not implemented: CreateUser - createUser"))
}

// Login is the resolver for the login field.
func (r *mutationResolver) Login(ctx context.Context, input model.LoginInput) (*model.User, error) {
	panic(fmt.Errorf("not implemented: Login - login"))
}

// CreateTag is the resolver for the createTag field.
func (r *mutationResolver) CreateTag(ctx context.Context, input model.TagInput) (*model.Tag, error) {
	panic(fmt.Errorf("not implemented: CreateTag - createTag"))
}

// Mutation returns gentypes.MutationResolver implementation.
func (r *Resolver) Mutation() gentypes.MutationResolver { return &mutationResolver{r} }

type mutationResolver struct{ *Resolver }
