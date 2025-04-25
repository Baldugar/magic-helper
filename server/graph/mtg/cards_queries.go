package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

func GetMTGCards(ctx context.Context) ([]*model.MtgCard, error) {
	log.Info().Msg("GetMTGCards: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
		RETURN doc
	`)

	col := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("@collection", col)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGCards: Error querying database")
		return nil, err
	}

	var cards []*model.MtgCard
	defer cursor.Close()
	for cursor.HasMore() {
		var card model.MtgCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGCards: Error reading document")
			return nil, err
		}
		cards = append(cards, &card)
	}

	log.Info().Msg("GetMTGCards: Finished")
	return cards, nil
}

func GetMTGFilters(ctx context.Context) (*model.MtgFilterEntries, error) {
	log.Info().Msg("GetMTGFilters: Started")

	// Query ArangoDB to get all typeLines
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
        RETURN {
            name: card.name,
            typeLine: card.typeLine
        }
    `)

	col := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("@collection", col)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGFilters: Error querying database")
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
			log.Error().Err(err).Msgf("GetMTGFilters: Error reading document")
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
	var filterEntries model.MtgFilterEntries
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
		filterEntries.Types = append(filterEntries.Types, &model.MtgFilterCardTypes{
			CardType: cardType,
			Subtypes: cleanedSubtypes,
		})
	}

	// Fetch expansions (set and setName)
	expansionsFilter, err := GetMTGExpansions(ctx)
	if err != nil {
		return nil, err
	}

	filterEntries.Expansions = expansionsFilter

	// Fetch legalities (formats and legalityValues)
	legalitiesFilter, err := GetMTGLegalities(ctx)
	if err != nil {
		return nil, err
	}

	filterEntries.Legality = legalitiesFilter

	log.Info().Msg("GetMTGFilters: Finished")
	return &filterEntries, nil
}

// GetMTGExpansions fetches distinct expansions (set and setName) from the database
func GetMTGExpansions(ctx context.Context) ([]*model.MtgFilterExpansion, error) {
	log.Info().Msg("GetMTGExpansions: Started")

	// AQL query to fetch distinct sets and setNames
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
			LET setRecord = DOCUMENT(@@setsCollection, card.set)
			// FILTER DATE_ADD(DATE_NOW(), 1, "week") >= DATE_TIMESTAMP(setRecord.releasedAt)
			FOR cv IN card.versions
	            COLLECT set = cv.set, setName = cv.setName
			LET setRecord = DOCUMENT(@@setsCollection, set)
            RETURN {
                set: UPPER(set),
                setName: setName,
				releasedAt: DATE_TIMESTAMP(setRecord.releasedAt),
				imageURL: setRecord.iconSVGURI
            }
    `)

	col := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("@setsCollection", arango.MTG_SETS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGExpansions: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var expansions []*model.MtgFilterExpansion
	for cursor.HasMore() {
		var expansion model.MtgFilterExpansion
		_, err := cursor.ReadDocument(ctx, &expansion)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGExpansions: Error reading document")
			return nil, err
		}
		expansions = append(expansions, &expansion)
	}

	log.Info().Msg("GetMTGExpansions: Finished")
	return expansions, nil
}

// GetMTGLegalities fetches all legality formats and statuses, then performs aggregation in Go
func GetMTGLegalities(ctx context.Context) (*model.MtgFilterLegality, error) {
	log.Info().Msg("GetMTGLegalities: Started")

	// AQL query to fetch legality formats and statuses for all cards
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
            LET legalities = FIRST(card.versions).legalities
            FOR legalityFormat IN ATTRIBUTES(legalities)
                LET legalityStatus = legalities[legalityFormat]
                RETURN {
                    format: legalityFormat,
                    status: legalityStatus
                }
    `)

	col := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("@collection", col)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGLegalities: Error querying database")
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
			log.Error().Err(err).Msgf("GetMTGLegalities: Error reading document")
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
	legality := &model.MtgFilterLegality{
		Formats:        formats,
		LegalityValues: statuses,
	}

	log.Info().Msg("GetMTGLegalities: Finished")
	return legality, nil
}
