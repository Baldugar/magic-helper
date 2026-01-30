package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"magic-helper/util/mtgCardSearch"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// GetMTGCards returns all MTG cards with ratings and tags, optimized via index hints.
func GetMTGCards(ctx context.Context) ([]*model.MtgCard, error) {
	log.Info().Msg("GetMTGCards: Started")

	// Build the query
	queryBuildStart := time.Now()
	aq := arango.NewQuery( /* aql */ `
		FOR doc IN mtg_cards 
			OPTIONS {
				indexHint: "mtg_cards_buildup"
			}
			FILTER (doc.manaCost == "" AND doc.layout != "meld") OR doc.manaCost != ""
			LET tags = (
				FOR tag IN 1..1 INBOUND doc mtg_tag_to_card
				SORT tag.name ASC
				RETURN { _key: tag._key, name: tag.name }
			)
			RETURN MERGE(doc, { tags })
	`)

	// Build the query
	queryBuildDuration := time.Since(queryBuildStart)

	// Execute the query
	queryExecStart := time.Now()
	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("GetMTGCards: Error querying database")
		return nil, err
	}
	queryExecDuration := time.Since(queryExecStart)

	// Process results
	processStart := time.Now()
	var cards []*model.MtgCard
	defer cursor.Close()
	for cursor.HasMore() {
		var card model.MtgCard
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGCards: Error reading document")
			return nil, err
		}
		if card.Tags == nil {
			card.Tags = []*model.MtgTag{}
		}
		cards = append(cards, &card)
	}
	processDuration := time.Since(processStart)

	totalDuration := queryBuildDuration + queryExecDuration + processDuration
	log.Info().
		Int("cards_count", len(cards)).
		Dur("totalDuration", totalDuration).
		Dur("queryBuildDuration", queryBuildDuration).
		Dur("queryExecDuration", queryExecDuration).
		Dur("processDuration", processDuration).
		Msg("GetMTGCards: Finished")

	return cards, nil
}

// GetMTGFilters returns filter entries (types, layouts, expansions, legalities).
// Uses in-memory processing when index is warm; otherwise queries ArangoDB.
func GetMTGFilters(ctx context.Context) (*model.MtgFilterEntries, error) {
	log.Info().Msg("GetMTGFilters: Started")

	var cards []*model.MtgCard
	var err error

	// Try to use cached cards from index if available
	if mtgCardSearch.IsIndexReady() {
		log.Info().Msg("GetMTGFilters: Using cached cards from index")
		cards = mtgCardSearch.GetAllCardsFromIndex()
	} else {
		log.Info().Msg("GetMTGFilters: Index not ready, fetching cards from database")
		// Query ArangoDB to get all typeLines
		aq := arango.NewQuery( /* aql */ `
			FOR card IN mtg_cards
			RETURN {
				name: card.name,
				typeLine: card.typeLine,
				layout: card.layout
			}
		`)

		cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGFilters: Error querying database")
			return nil, err
		}
		defer cursor.Close()

		for cursor.HasMore() {
			var card model.MtgCard
			_, err := cursor.ReadDocument(ctx, &card)
			if err != nil {
				log.Error().Err(err).Msgf("GetMTGFilters: Error reading document")
				return nil, err
			}
			cards = append(cards, &card)
		}
	}

	var typeMap = make(map[string]map[string]struct{}) // Map to store types and their subtypes
	var gatheredTypes = make(map[string]struct{})      // Set to store all types
	var layouts = make(map[string]struct{})            // Set to store all layouts

	// Process cards from either index or database
	for _, card := range cards {
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

		// Add the layout to the layouts set
		layouts[string(card.Layout)] = struct{}{}
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

	filterEntries.Layouts = make([]model.MtgLayout, 0, len(layouts))
	for layout := range layouts {
		filterEntries.Layouts = append(filterEntries.Layouts, model.MtgLayout(layout))
	}

	log.Info().Msg("GetMTGFilters: Finished")
	return &filterEntries, nil
}

// GetMTGExpansions fetches distinct expansions (set and setName).
func GetMTGExpansions(ctx context.Context) ([]*model.MtgFilterExpansion, error) {
	log.Info().Msg("GetMTGExpansions: Started")

	var cards []*model.MtgCard
	var err error

	// Try to use cached cards from index if available
	if mtgCardSearch.IsIndexReady() {
		log.Info().Msg("GetMTGExpansions: Using cached cards from index")
		cards = mtgCardSearch.GetAllCardsFromIndex()
	} else {
		log.Info().Msg("GetMTGExpansions: Index not ready, fetching basic cards from database")
		// Fetch only the versions data we need, not full cards
		aq := arango.NewQuery( /* aql */ `
			FOR card IN mtg_cards
				RETURN {
					versions: card.versions
				}
		`)

		cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msgf("GetMTGExpansions: Error querying database")
			return nil, err
		}
		defer cursor.Close()

		for cursor.HasMore() {
			var card model.MtgCard
			_, err := cursor.ReadDocument(ctx, &card)
			if err != nil {
				log.Error().Err(err).Msgf("GetMTGExpansions: Error reading document")
				return nil, err
			}
			cards = append(cards, &card)
		}
	}

	// Process expansion data in Go for memory efficiency
	log.Info().Msg("GetMTGExpansions: Processing expansions in Go")
	expansionMap := make(map[string]*model.MtgFilterExpansion)

	// First pass: collect unique expansions and aggregate games
	for _, card := range cards {
		if card.Versions == nil {
			continue
		}
		for _, version := range card.Versions {

			setCode := strings.ToUpper(version.Set)
			key := setCode + "|" + version.SetName

			if expansion, exists := expansionMap[key]; exists {
				// Merge games arrays
				if version.Games != nil {
					expansion.Games = mergeGameArrays(expansion.Games, version.Games)
				}
			} else {
				// Create new expansion entry
				games := []model.MtgGame{}
				if version.Games != nil {
					games = append(games, version.Games...)
				}

				expansionMap[key] = &model.MtgFilterExpansion{
					Set:     setCode,
					SetName: version.SetName,
					Games:   games,
				}
			}
		}
	}

	// Second pass: fetch set details in batch for memory efficiency
	log.Info().Int("unique_sets", len(expansionMap)).Msg("GetMTGExpansions: Fetching set details")
	var setCodes []string
	for _, expansion := range expansionMap {
		setCodes = append(setCodes, expansion.Set)
	}

	// Batch fetch set details
	setDetailsMap, err := fetchSetDetailsBatch(ctx, setCodes)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGExpansions: Error fetching set details")
		return nil, err
	}

	// Final pass: merge set details and build result
	var expansions []*model.MtgFilterExpansion
	for _, expansion := range expansionMap {
		if setDetails, exists := setDetailsMap[expansion.Set]; exists {
			expansion.ReleasedAt = int(*setDetails.ReleasedAt)
			expansion.ImageURL = *setDetails.ImageURL
			expansion.SetType = *setDetails.SetType
		}
		expansions = append(expansions, expansion)
	}

	log.Info().Int("expansions_count", len(expansions)).Msg("GetMTGExpansions: Finished")
	return expansions, nil
}

// mergeGameArrays merges two lists of games removing duplicates.
func mergeGameArrays(games1, games2 []model.MtgGame) []model.MtgGame {
	gameSet := make(map[model.MtgGame]struct{})

	// Add all games from first array
	for _, game := range games1 {
		gameSet[game] = struct{}{}
	}

	// Add all games from second array
	for _, game := range games2 {
		gameSet[game] = struct{}{}
	}

	// Convert back to slice
	var result []model.MtgGame
	for game := range gameSet {
		result = append(result, game)
	}

	return result
}

// fetchSetDetailsBatch queries set details for the provided set codes in batch.
func fetchSetDetailsBatch(ctx context.Context, setCodes []string) (map[string]struct {
	ReleasedAt *int64
	ImageURL   *string
	SetType    *string
}, error) {
	if len(setCodes) == 0 {
		return make(map[string]struct {
			ReleasedAt *int64
			ImageURL   *string
			SetType    *string
		}), nil
	}

	log.Info().Msgf("Fetching set details for %v sets. %v", len(setCodes), setCodes)

	aq := arango.NewQuery( /* aql */ `
		FOR setCode IN @setCodes
			LET setDetails = DOCUMENT("mtg_sets", LOWER(setCode))
			FILTER setDetails != null
			RETURN {
				setCode: setCode,
				releasedAt: DATE_TIMESTAMP(setDetails.releasedAt),
				imageURL: setDetails.iconSVGURI,
				setType: setDetails.setType
			}
	`)

	aq.AddBindVar("setCodes", setCodes)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	result := make(map[string]struct {
		ReleasedAt *int64
		ImageURL   *string
		SetType    *string
	})

	for cursor.HasMore() {
		var setDetail struct {
			SetCode    string  `json:"setCode"`
			ReleasedAt *int64  `json:"releasedAt"`
			ImageURL   *string `json:"imageURL"`
			SetType    *string `json:"setType"`
		}
		_, err := cursor.ReadDocument(ctx, &setDetail)
		if err != nil {
			return nil, err
		}

		result[setDetail.SetCode] = struct {
			ReleasedAt *int64
			ImageURL   *string
			SetType    *string
		}{
			ReleasedAt: setDetail.ReleasedAt,
			ImageURL:   setDetail.ImageURL,
			SetType:    setDetail.SetType,
		}
	}

	return result, nil
}

// GetMTGLegalities fetches all legality formats and statuses and aggregates them.
func GetMTGLegalities(ctx context.Context) (*model.MtgFilterLegality, error) {
	log.Info().Msg("GetMTGLegalities: Started")

	// AQL query to fetch legality formats and statuses for all cards
	aq := arango.NewQuery( /* aql */ `
        FOR card IN mtg_cards
            LET legalities = FIRST(card.versions).legalities
            FOR legalityFormat IN ATTRIBUTES(legalities)
                LET legalityStatus = legalities[legalityFormat]
                RETURN {
                    format: legalityFormat,
                    status: legalityStatus
                }
    `)

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

// GetMTGCardsFiltered filters, sorts, and paginates cards using the search index when available.
func GetMTGCardsFiltered(ctx context.Context, filter model.MtgFilterSearchInput, pagination model.MtgFilterPaginationInput, sort []*model.MtgFilterSortInput) (*model.MtgFilterSearch, error) {
	log.Info().Msg("GetMTGCardsFiltered: Started")

	// Step 1: Get basic cards for filtering (without ratings/tags)
	step1Start := time.Now()
	var cards []*model.MtgCard
	var err error

	// Try to use cached cards from index if available
	if mtgCardSearch.IsIndexReady() {
		log.Info().Msg("GetMTGCardsFiltered: Using cached cards from index")
		cards = mtgCardSearch.GetAllCardsFromIndex()
		if len(cards) == 0 {
			log.Error().Msg("GetMTGCardsFiltered: No cards found in index")
			cards, err = GetMTGCards(ctx)
			if err != nil {
				return nil, err
			}
			mtgCardSearch.BuildCardIndexWithCards(cards)
		}
	} else {
		log.Info().Msg("GetMTGCardsFiltered: Index not ready, fetching basic cards from database")
		cards, err = GetMTGCards(ctx)
		if err != nil {
			return nil, err
		}
		mtgCardSearch.BuildCardIndexWithCards(cards)
	}
	step1Duration := time.Since(step1Start)
	log.Info().
		Int("basic_cards", len(cards)).
		Dur("duration", step1Duration).
		Msg("GetMTGCardsFiltered: Basic cards fetched")

	// Step 2: Filter, sort, and paginate in one pass (predicate + heap-based Top-K)
	step2Start := time.Now()
	pagedCards, totalCount := mtgCardSearch.FilterCardsWithPagination(cards, filter, sort, pagination)
	step2Duration := time.Since(step2Start)
	log.Info().
		Int("totalCount", totalCount).
		Int("pagedCards", len(pagedCards)).
		Dur("duration", step2Duration).
		Msg("GetMTGCardsFiltered: Cards filtered and paginated")

	// When games filter is set, return each card with only versions matching the filter
	// (e.g. Arena only) so the client sees only those versions. Shallow-copy to avoid mutating cache.
	if len(filter.Games) > 0 {
		for i, card := range pagedCards {
			effective := mtgCardSearch.EffectiveVersionsForGames(card, filter.Games)
			if len(effective) < len(card.Versions) {
				cardCopy := *card
				cardCopy.Versions = effective
				pagedCards[i] = &cardCopy
			}
		}
	}
	// Ensure tags slice is never nil (e.g. when cards come from index built without tags).
	for _, card := range pagedCards {
		if card.Tags == nil {
			card.Tags = []*model.MtgTag{}
		}
	}

	totalDuration := step1Duration + step2Duration
	log.Info().
		Dur("totalDuration", totalDuration).
		Dur("step1Duration", step1Duration).
		Dur("step2Duration", step2Duration).
		Msg("GetMTGCardsFiltered: Finished")

	return &model.MtgFilterSearch{PagedCards: pagedCards, TotalCount: totalCount}, nil
}
