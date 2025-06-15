package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"
	"magic-helper/util/ctxkeys"

	"github.com/rs/zerolog/log"
)

func GetMTGCards(ctx context.Context) ([]*model.MtgCard, error) {
	log.Info().Msg("GetMTGCards: Started")

	// Debug logging for context
	log.Debug().
		Interface("context_keys", ctx.Value(ctxkeys.UserIDKey)).
		Msg("GetMTGCards: Context debug")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN @@collection
			FILTER (doc.manaCost == "" AND doc.layout != "meld") OR doc.manaCost != ""
			LET ratings = (
				FOR user, rating IN 1..1 INBOUND doc @@userRatingEdge
				RETURN {
					user: user,
					value: rating.value
				}
			)
			LET cardTags = (
				FOR tag, tagEdge IN 1..1 INBOUND doc @@tagCardEdge
				FILTER tag.type == "CardTag"
				LET cardTagRatings = (
					FOR user, rating IN 1..1 INBOUND tag @@userRatingEdge
					RETURN {
						user: user,
						value: rating.value
					}
				)
				RETURN MERGE(tag, {
					aggregatedRating: {
						average: AVERAGE(cardTagRatings[*].value),
						count: LENGTH(cardTagRatings)
					},
					ratings: cardTagRatings,
					myRating: @userID != "" ? FIRST(
						FOR rating IN cardTagRatings
							FILTER rating.user._key == @userID
							RETURN rating
					) : {}
				})
			)
			LET deckTags = (
				FOR tag, tagEdge IN 1..1 INBOUND doc @@tagCardEdge
				FILTER tag.type == "DeckTag"
				LET cardTagRatings = (
					FOR user, rating IN 1..1 INBOUND tag @@userRatingEdge
					RETURN {
						user: user,
						value: rating.value
					}
				)
				RETURN MERGE(tag, {
					aggregatedRating: {
						average: AVERAGE(cardTagRatings[*].value),
						count: LENGTH(cardTagRatings)
					},
					ratings: cardTagRatings,
					myRating: @userID != "" ? FIRST(
						FOR rating IN cardTagRatings
							FILTER rating.user._key == @userID
							RETURN rating
					) : {}
				})
			)
			RETURN MERGE(doc, {
				aggregatedRating: {
					average: AVERAGE(ratings[*].value),
					count: LENGTH(ratings)
				},
				ratings: ratings,
				myRating: @userID != "" ? FIRST(
					FOR rating IN ratings
						FILTER rating.user._key == @userID
						RETURN rating
				) : {},
				cardTags: cardTags,
				deckTags: deckTags
			})
	`)

	col := arango.MTG_CARDS_COLLECTION

	aq.AddBindVar("@collection", col)
	aq.AddBindVar("@userRatingEdge", arango.MTG_USER_RATING_EDGE_COLLECTION)
	aq.AddBindVar("@tagCardEdge", arango.MTG_TAG_EDGE_COLLECTION)

	// Safely get user ID from context with logging
	userID, ok := ctx.Value(ctxkeys.UserIDKey).(string)
	if !ok {
		log.Warn().
			Interface("user_id_value", ctx.Value(ctxkeys.UserIDKey)).
			Bool("type_assertion_ok", ok).
			Msg("GetMTGCards: Failed to get user ID from context")
		// Use the default user ID if not present
		userID = util.USER_ID
	}
	log.Debug().
		Str("user_id", userID).
		Interface("bind_vars", aq.BindVars).
		Msg("GetMTGCards: Setting user ID bind variable")

	// Set the user ID bind variable
	aq = aq.AddBindVar("userID", userID)

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
            typeLine: card.typeLine,
			layout: card.layout
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
	var layouts = make(map[string]struct{})            // Set to store all layouts

	for cursor.HasMore() {
		var card struct {
			Name     string `json:"name"`
			TypeLine string `json:"typeLine"`
			Layout   string `json:"layout"`
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

		// Add the layout to the layouts set
		layouts[card.Layout] = struct{}{}
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

// GetMTGExpansions fetches distinct expansions (set and setName) from the database
func GetMTGExpansions(ctx context.Context) ([]*model.MtgFilterExpansion, error) {
	log.Info().Msg("GetMTGExpansions: Started")

	// AQL query to fetch distinct sets and setNames, with optimized memory usage
	aq := arango.NewQuery( /* aql */ `
        FOR card IN @@collection
            FOR cv IN card.versions
                COLLECT setCode = cv.set, setNameVal = cv.setName, games = cv.games INTO versionGroup
                LET setDetails = DOCUMENT(@@setsCollection, setCode)
                LET uniqueGames = UNIQUE(FLATTEN(
                    FOR group IN versionGroup
                        RETURN group.games
                ))
                RETURN {
                    set: UPPER(setCode),
                    setName: setNameVal,
                    games: uniqueGames,
                    releasedAt: DATE_TIMESTAMP(setDetails.releasedAt),
                    imageURL: setDetails.iconSVGURI,
                    setType: setDetails.setType
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
