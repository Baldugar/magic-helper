package graph

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.66

import (
	"context"
	"magic-helper/graph/gentypes"
	"magic-helper/graph/model"
	"magic-helper/graph/mtg"
)

// CreateMTGDeck is the resolver for the createMTGDeck field.
func (r *mutationResolver) CreateMTGDeck(ctx context.Context, input model.MtgCreateDeckInput) (*model.MtgDeck, error) {
	return mtg.CreateMTGDeck(ctx, input)
}

// DeleteMTGDeck is the resolver for the deleteMTGDeck field.
func (r *mutationResolver) DeleteMTGDeck(ctx context.Context, input model.MtgDeleteDeckInput) (bool, error) {
	return mtg.DeleteMTGDeck(ctx, input)
}

// UpdateMTGDeck is the resolver for the updateMTGDeck field.
func (r *mutationResolver) UpdateMTGDeck(ctx context.Context, input model.MtgUpdateDeckInput) (*model.MtgDeck, error) {
	return mtg.UpdateMTGDeck(ctx, input)
}

// SaveMTGDeckAsCopy is the resolver for the saveMTGDeckAsCopy field.
func (r *mutationResolver) SaveMTGDeckAsCopy(ctx context.Context, input model.MtgUpdateDeckInput) (*model.MtgDeck, error) {
	return mtg.SaveMTGDeckAsCopy(ctx, input)
}

// CreateMTGCardPackage is the resolver for the createMTGCardPackage field.
func (r *mutationResolver) CreateMTGCardPackage(ctx context.Context, input model.MtgCreateCardPackageInput) (*model.MtgCardPackage, error) {
	return mtg.CreateMTGCardPackage(ctx, input)
}

// DeleteMTGCardPackage is the resolver for the deleteMTGCardPackage field.
func (r *mutationResolver) DeleteMTGCardPackage(ctx context.Context, input model.MtgDeleteCardPackageInput) (bool, error) {
	return mtg.DeleteMTGCardPackage(ctx, input)
}

// AddMTGCardToCardPackage is the resolver for the addMTGCardToCardPackage field.
func (r *mutationResolver) AddMTGCardToCardPackage(ctx context.Context, input model.MtgAddCardToCardPackageInput) (*model.MtgCardPackage, error) {
	return mtg.AddMTGCardToCardPackage(ctx, input)
}

// RemoveMTGCardFromCardPackage is the resolver for the removeMTGCardFromCardPackage field.
func (r *mutationResolver) RemoveMTGCardFromCardPackage(ctx context.Context, input model.MtgRemoveCardFromCardPackageInput) (*model.MtgCardPackage, error) {
	return mtg.RemoveMTGCardFromCardPackage(ctx, input)
}

// Mutation returns gentypes.MutationResolver implementation.
func (r *Resolver) Mutation() gentypes.MutationResolver { return &mutationResolver{r} }

type mutationResolver struct{ *Resolver }
