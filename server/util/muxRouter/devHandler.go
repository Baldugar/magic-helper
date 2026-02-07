package muxRouter

import (
	"context"
	"encoding/json"
	"magic-helper/arango"
	"net/http"

	"github.com/rs/zerolog/log"
)

// clearUserDataHandler clears all user-created data from the database.
// This includes decks, tags, filter presets, card packages, and their related edges.
func clearUserDataHandler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Define collections to clear (user data only)
	userDocCollections := []string{
		arango.MTG_DECKS_COLLECTION.String(),
		arango.MTG_FILTER_PRESETS_COLLECTION.String(),
		arango.MTG_TAGS_COLLECTION.String(),
		arango.MTG_CARD_PACKAGES_COLLECTION.String(),
	}

	userEdgeCollections := []string{
		arango.MTG_CARD_DECK_EDGE.String(),
		arango.MTG_DECK_FRONT_IMAGE_EDGE.String(),
		arango.MTG_IGNORED_CARDS_EDGE_COLLECTION.String(),
		arango.MTG_FILTER_PRESET_FOR_DECK_EDGE.String(),
		arango.MTG_TAG_TO_DECK_EDGE.String(),
		arango.MTG_TAG_TO_CARD_EDGE.String(),
		arango.MTG_TAG_TO_CARD_PACKAGE_EDGE.String(),
		arango.MTG_CARD_IN_CARD_PACKAGE_EDGE.String(),
	}

	allCollections := append(userDocCollections, userEdgeCollections...)
	errors := []string{}

	for _, collectionName := range allCollections {
		aq := arango.NewQuery(`
			FOR doc IN @@collection
				REMOVE doc IN @@collection
		`).AddBindVar("@collection", collectionName)

		_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("Error clearing collection %s", collectionName)
			errors = append(errors, collectionName)
		} else {
			log.Info().Msgf("Cleared collection %s", collectionName)
		}
	}

	w.Header().Set("Content-Type", "application/json")

	if len(errors) > 0 {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"message": "Some collections failed to clear",
			"errors":  errors,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": "All user data cleared successfully",
	})
}
