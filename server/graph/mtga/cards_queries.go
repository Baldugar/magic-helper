package mtga

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

func GetMTGACards(ctx context.Context) ([]*model.MtgaCard, error) {
	log.Info().Msg("GetMTGACards: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
		RETURN doc
	`)

	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGACards: Error querying database")
		return nil, err
	}

	var cards []*model.MtgaCard
	defer cursor.Close()
	for cursor.HasMore() {
		var card model.MtgaCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGACards: Error reading document")
			return nil, err
		}
		cards = append(cards, &card)
	}

	log.Info().Msg("GetMTGACards: Finished")
	return cards, nil
}

func GetMTGAFilters(ctx context.Context) (*model.MtgaFilterEntries, error) {
	log.Info().Msg("GetMTGAFilters: Started")

	// Query ArangoDB to get all typeLines
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
        RETURN {
            name: card.name,
            typeLine: card.typeLine
        }
    `)
	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGAFilters: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var typeMap = make(map[string]map[string]struct{}) // Map to store types and their subtypes
	var gatheredTypes = make(map[string]struct{})      // Set to store all types

	for cursor.HasMore() {
		var card struct {
			Name     string `json:"name"`
			TypeLine string `json:"typeLine"`
		}
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGAFilters: Error reading document")
			return nil, err
		}

		// Process the typeLine into types and subtypes
		types, subtypes := util.SplitTypeLine(card.TypeLine)

		// Add valid types (skipping "//") to the gatheredTypes set
		for _, cardType := range types {
			if cardType != "//" {
				gatheredTypes[cardType] = struct{}{}
			}
		}

		// Store the types and their subtypes in typeMap
		for _, cardType := range types {
			if cardType == "//" {
				continue // Skip cardTypes that are "//"
			}
			if _, exists := typeMap[cardType]; !exists {
				typeMap[cardType] = make(map[string]struct{})
			}
			for _, subtype := range subtypes {
				typeMap[cardType][subtype] = struct{}{}
			}
		}
	}

	// Now perform the final cleaning to remove subtypes that exist in the gathered types
	var filterEntries model.MtgaFilterEntries
	for cardType, subtypesMap := range typeMap {
		if len(cardType) == 0 {
			continue
		}
		var subtypesList []string
		for subtype := range subtypesMap {
			subtypesList = append(subtypesList, subtype)
		}

		// Clean subtypes by removing any that match the gathered types
		cleanedSubtypes := util.CleanFinalSubtypes(gatheredTypes, subtypesList)

		// Add the cleaned types and subtypes to the final filter entries
		filterEntries.Types = append(filterEntries.Types, &model.MtgaFilterCardTypes{
			CardType: cardType,
			Subtypes: cleanedSubtypes,
		})
	}

	// Fetch expansions (set and setName)
	expansionsFilter, err := GetMTGAExpansions(ctx)
	if err != nil {
		return nil, err
	}

	filterEntries.Expansions = expansionsFilter

	// Fetch legalities (formats and legalityValues)
	legalitiesFilter, err := GetMTGALegalities(ctx)
	if err != nil {
		return nil, err
	}

	filterEntries.Legality = legalitiesFilter

	log.Info().Msg("GetMTGAFilters: Finished")
	return &filterEntries, nil
}

// GetMTGAExpansions fetches distinct expansions (set and setName) from the database
func GetMTGAExpansions(ctx context.Context) ([]*model.MtgaFilterExpansion, error) {
	log.Info().Msg("GetMTGAExpansions: Started")

	// AQL query to fetch distinct sets and setNames
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
            COLLECT set = card.set, setName = card.setName
            RETURN {
                set: UPPER(set),
                setName: setName
            }
    `)
	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGAExpansions: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var expansions []*model.MtgaFilterExpansion
	for cursor.HasMore() {
		var expansion model.MtgaFilterExpansion
		_, err := cursor.ReadDocument(ctx, &expansion)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGAExpansions: Error reading document")
			return nil, err
		}
		expansions = append(expansions, &expansion)
	}

	log.Info().Msg("GetMTGAExpansions: Finished")
	return expansions, nil
}

// GetMTGALegalities fetches all legality formats and statuses, then performs aggregation in Go
func GetMTGALegalities(ctx context.Context) (*model.MtgaFilterLegality, error) {
	log.Info().Msg("GetMTGALegalities: Started")

	// AQL query to fetch legality formats and statuses for all cards
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
            LET legalities = card.legalities
            FOR legalityFormat IN ATTRIBUTES(legalities)
                LET legalityStatus = legalities[legalityFormat]
                RETURN {
                    format: legalityFormat,
                    status: legalityStatus
                }
    `)
	aq.AddBindVar("@collection", arango.MTGA_CARDS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGALegalities: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	// Use maps to ensure uniqueness of formats and statuses
	formatSet := make(map[string]struct{})
	statusSet := make(map[string]struct{})

	for cursor.HasMore() {
		var result struct {
			Format string `json:"format"`
			Status string `json:"status"`
		}
		_, err := cursor.ReadDocument(ctx, &result)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGALegalities: Error reading document")
			return nil, err
		}

		// Add the format and status to their respective sets to ensure uniqueness
		formatSet[result.Format] = struct{}{}
		statusSet[result.Status] = struct{}{}
	}

	// Convert the sets to slices to ensure uniqueness
	formats := make([]string, 0, len(formatSet))
	for format := range formatSet {
		formats = append(formats, format)
	}

	statuses := make([]string, 0, len(statusSet))
	for status := range statusSet {
		statuses = append(statuses, status)
	}

	// Build the final legality filter
	legality := &model.MtgaFilterLegality{
		Formats:        formats,
		LegalityValues: statuses,
	}

	log.Info().Msg("GetMTGALegalities: Finished")
	return legality, nil
}
