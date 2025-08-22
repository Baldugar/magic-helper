package mtgCardSearch

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"slices"
	"strconv"
	"strings"
	"time"

	"sort"

	"github.com/rs/zerolog/log"
)

func FilterCards(cards []*model.MtgCard, filter model.MtgFilterSearchInput, sort []*model.MtgFilterSortInput) []*model.MtgCard {
	// Try to use cached cards from index if available and no cards were provided
	var cardsToFilter []*model.MtgCard

	if len(cards) == 0 && IsIndexReady() {
		log.Debug().Msg("Using cards from index for filtering")
		cardsToFilter = GetAllCardsFromIndex()
	} else if len(cards) > 0 {
		cardsToFilter = cards
	} else {
		log.Warn().Msg("No cards provided and index is not ready")
		return []*model.MtgCard{}
	}

	filteredCards := make([]*model.MtgCard, 0, len(cardsToFilter))

	ignoredCardIDs := make([]string, 0)
	if filter.DeckID != nil && filter.HideIgnored {
		ctx := context.Background()
		aq := arango.NewQuery( /* aql */ `
			FOR card, edge IN 1..1 INBOUND doc MTG_Deck_Ignore_Card
			RETURN card.ID
		`)
		cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msg("Error querying database")
			return []*model.MtgCard{}
		}
		for cursor.HasMore() {
			var ignoredCard string
			_, err := cursor.ReadDocument(ctx, &ignoredCard)
			if err != nil {
				log.Error().Err(err).Msg("Error reading document")
				return []*model.MtgCard{}
			}
			ignoredCardIDs = append(ignoredCardIDs, ignoredCard)
		}
	}

	for _, card := range cardsToFilter {
		if passesFilter(card, filter, cardsToFilter, ignoredCardIDs) {
			filteredCards = append(filteredCards, card)
		}
	}

	// Apply sorting if provided
	if len(sort) > 0 {
		filteredCards = applySorting(filteredCards, sort)
	}

	log.Debug().
		Int("input_cards", len(cardsToFilter)).
		Int("filtered_cards", len(filteredCards)).
		Msg("Filtering completed")

	return filteredCards
}

func PaginateCards(cards []*model.MtgCard, pagination model.MtgFilterPaginationInput) []*model.MtgCard {
	// Convert page and pageSize to offset and limit
	log.Info().Int("page", pagination.Page).Int("pageSize", pagination.PageSize).Msg("PaginateCards: Pagination")
	offset := (pagination.Page) * pagination.PageSize
	limit := pagination.PageSize

	start := offset
	end := start + limit

	if start >= len(cards) {
		return []*model.MtgCard{}
	}

	if end > len(cards) {
		end = len(cards)
	}

	return cards[start:end]
}

// passesFilter checks if a card passes all the filter criteria
func passesFilter(card *model.MtgCard, filter model.MtgFilterSearchInput, cards []*model.MtgCard, ignoredCardIDs []string) bool {
	if slices.Contains(ignoredCardIDs, card.ID) {
		return false
	}

	var commanderCard *model.MtgCard
	if filter.Commander != nil {
		for _, card := range cards {
			if card.ID == *filter.Commander {
				commanderCard = card
				break
			}
		}
	}

	if commanderCard != nil {
		// Commander color identity restriction: card must only contain colors from commander's color identity
		// or be colorless

		if len(card.ColorIdentity) > 0 {
			// Check if the card has any colors outside the commander's color identity
			for _, cardColor := range card.ColorIdentity {
				colorAllowed := slices.Contains(commanderCard.ColorIdentity, cardColor)
				if !colorAllowed {
					return false // Card has a color not in commander's color identity
				}
			}
		}
	}

	if filter.IsSelectingCommander {
		if !(strings.Contains(card.TypeLine, "Legendary") && (strings.Contains(card.TypeLine, "Creature") || strings.Contains(card.TypeLine, "Planeswalker"))) {
			return false
		}
	}

	// Search string filtering
	if filter.SearchString != nil && *filter.SearchString != "" {
		if !passesSearchString(card, *filter.SearchString) {
			return false
		}
	}

	// Color filtering
	if !passesColorFilter(card, filter.Color, filter.MultiColor) {
		return false
	}

	// Rarity filtering
	if !passesRarityFilter(card, filter.Rarity) {
		return false
	}

	// Mana cost filtering
	if !passesManaCostFilter(card, filter.ManaCosts) {
		return false
	}

	// Set filtering
	if !passesSetFilter(card, filter.Sets) {
		return false
	}

	// Card type filtering
	if !passesCardTypeFilter(card, filter.CardTypes) {
		return false
	}

	// Layout filtering
	if !passesLayoutFilter(card, filter.Layouts) {
		return false
	}

	// Game filtering
	if !passesGameFilter(card, filter.Games) {
		return false
	}

	// Tag filtering
	if !passesTagFilter(card, filter.Tags) {
		return false
	}

	// Rating filtering
	if !passesRatingFilter(card, filter.Rating) {
		return false
	}

	return true
}

// passesSearchString checks if a card matches the search string criteria
func passesSearchString(card *model.MtgCard, searchString string) bool {
	searchQueries := strings.Split(searchString, ";")

	for _, queryStr := range searchQueries {
		query := CalculateQuery(strings.TrimSpace(queryStr))

		switch query.Type {
		case QueryTypeCardType:
			if value, ok := query.Value.(string); ok {
				cardTypeMatch := strings.Contains(strings.ToLower(card.TypeLine), strings.ToLower(value))
				if (query.Not && cardTypeMatch) || (!query.Not && !cardTypeMatch) {
					return false
				}
			}

		case QueryTypeRarity:
			if rarity, ok := query.Value.(model.MtgRarity); ok {
				hasRarity := false
				for _, version := range card.Versions {
					if version.Rarity == rarity {
						hasRarity = true
						break
					}
				}
				if (query.Not && hasRarity) || (!query.Not && !hasRarity) {
					return false
				}
			}

		case QueryTypeCMCEq:
			if value, ok := query.Value.(int); ok {
				cmcMatch := card.Cmc == float64(value)
				if (query.Not && cmcMatch) || (!query.Not && !cmcMatch) {
					return false
				}
			}

		case QueryTypeCMCGt:
			if value, ok := query.Value.(int); ok {
				cmcMatch := card.Cmc > float64(value)
				if (query.Not && cmcMatch) || (!query.Not && !cmcMatch) {
					return false
				}
			}

		case QueryTypeCMCLt:
			if value, ok := query.Value.(int); ok {
				cmcMatch := card.Cmc < float64(value)
				if (query.Not && cmcMatch) || (!query.Not && !cmcMatch) {
					return false
				}
			}

		case QueryTypeCMCGtEq:
			if value, ok := query.Value.(int); ok {
				cmcMatch := card.Cmc >= float64(value)
				if (query.Not && cmcMatch) || (!query.Not && !cmcMatch) {
					return false
				}
			}

		case QueryTypeCMCLtEq:
			if value, ok := query.Value.(int); ok {
				cmcMatch := card.Cmc <= float64(value)
				if (query.Not && cmcMatch) || (!query.Not && !cmcMatch) {
					return false
				}
			}

		case QueryTypeColor:
			if colors, ok := query.Value.([]model.MtgColor); ok {
				hasAnyColor := false
				for _, color := range colors {
					for _, cardColor := range card.ColorIdentity {
						if cardColor == color {
							hasAnyColor = true
							break
						}
					}
					if hasAnyColor {
						break
					}
				}
				if (query.Not && hasAnyColor) || (!query.Not && !hasAnyColor) {
					return false
				}
			}

		case QueryTypeSet:
			if setValue, ok := query.Value.(string); ok {
				hasSet := false
				for _, version := range card.Versions {
					if strings.EqualFold(version.Set, setValue) || strings.EqualFold(version.SetName, setValue) {
						hasSet = true
						break
					}
				}
				if (query.Not && hasSet) || (!query.Not && !hasSet) {
					return false
				}
			}

		case QueryTypeOracle:
			if searchValue, ok := query.Value.(string); ok {
				searchLower := strings.ToLower(searchValue)
				matches := card.OracleText != nil && strings.Contains(strings.ToLower(*card.OracleText), searchLower)

				if (query.Not && matches) || (!query.Not && !matches) {
					return false
				}
			}

		case QueryTypeFlavorText:
			if searchValue, ok := query.Value.(string); ok {
				searchLower := strings.ToLower(searchValue)
				matches := false

				// Check versions for flavor text
				for _, version := range card.Versions {
					if version.FlavorText != nil && strings.Contains(strings.ToLower(*version.FlavorText), searchLower) {
						matches = true
						break
					}
				}

				if (query.Not && matches) || (!query.Not && !matches) {
					return false
				}
			}

		case QueryTypeSearch:
			if searchValue, ok := query.Value.(string); ok {
				searchLower := strings.ToLower(searchValue)
				matches := strings.Contains(strings.ToLower(card.Name), searchLower)

				if (query.Not && matches) || (!query.Not && !matches) {
					return false
				}
			}
		}
	}

	return true
}

// passesColorFilter checks if a card passes the color filtering criteria
func passesColorFilter(card *model.MtgCard, colorFilters []*model.MtgFilterColorInput, multiColor model.TernaryBoolean) bool {
	if len(colorFilters) == 0 && multiColor == model.TernaryBooleanUnset {
		return true
	}

	// Handle multicolor filtering
	switch multiColor {
	case model.TernaryBooleanTrue:
		if len(card.ColorIdentity) <= 1 {
			return false
		}
	case model.TernaryBooleanFalse:
		if len(card.ColorIdentity) > 1 {
			return false
		}
	}

	// Handle color filtering
	if len(colorFilters) > 0 {
		positiveColors := make([]model.MtgColor, 0)
		negativeColors := make([]model.MtgColor, 0)

		for _, colorFilter := range colorFilters {
			switch colorFilter.Value {
			case model.TernaryBooleanTrue:
				positiveColors = append(positiveColors, colorFilter.Color)
			case model.TernaryBooleanFalse:
				negativeColors = append(negativeColors, colorFilter.Color)
			}
		}

		// Check positive colors
		if len(positiveColors) > 0 {
			hasPositiveColor := false
			for _, posColor := range positiveColors {
				for _, cardColor := range card.ColorIdentity {
					if cardColor == posColor {
						hasPositiveColor = true
						break
					}
				}
				if hasPositiveColor {
					break
				}
			}
			if !hasPositiveColor {
				return false
			}
		}

		// Check negative colors
		for _, negColor := range negativeColors {
			for _, cardColor := range card.ColorIdentity {
				if cardColor == negColor {
					return false
				}
			}
		}
	}

	return true
}

// passesRarityFilter checks if a card passes the rarity filtering criteria
func passesRarityFilter(card *model.MtgCard, rarityFilters []*model.MtgFilterRarityInput) bool {
	if len(rarityFilters) == 0 {
		return true
	}

	positiveRarities := make([]model.MtgRarity, 0)
	negativeRarities := make([]model.MtgRarity, 0)

	for _, rarityFilter := range rarityFilters {
		switch rarityFilter.Value {
		case model.TernaryBooleanTrue:
			positiveRarities = append(positiveRarities, rarityFilter.Rarity)
		case model.TernaryBooleanFalse:
			negativeRarities = append(negativeRarities, rarityFilter.Rarity)
		}
	}

	// Check positive rarities
	if len(positiveRarities) > 0 {
		hasPositiveRarity := false
		for _, posRarity := range positiveRarities {
			for _, version := range card.Versions {
				if version.Rarity == posRarity {
					hasPositiveRarity = true
					break
				}
			}
			if hasPositiveRarity {
				break
			}
		}
		if !hasPositiveRarity {
			return false
		}
	}

	// Check negative rarities
	for _, negRarity := range negativeRarities {
		for _, version := range card.Versions {
			if version.Rarity == negRarity {
				return false
			}
		}
	}

	return true
}

// passesManaCostFilter checks if a card passes the mana cost filtering criteria
func passesManaCostFilter(card *model.MtgCard, manaCostFilters []*model.MtgFilterManaCostInput) bool {
	if len(manaCostFilters) == 0 {
		return true
	}

	positiveManaCosts := make([]string, 0)
	negativeManaCosts := make([]string, 0)

	for _, manaCostFilter := range manaCostFilters {
		switch manaCostFilter.Value {
		case model.TernaryBooleanTrue:
			positiveManaCosts = append(positiveManaCosts, manaCostFilter.ManaCost)
		case model.TernaryBooleanFalse:
			negativeManaCosts = append(negativeManaCosts, manaCostFilter.ManaCost)
		}
	}

	// Check positive mana costs
	if len(positiveManaCosts) > 0 {
		hasPositiveManaCost := false
		for _, posManaCost := range positiveManaCosts {
			if posManaCost == "infinite" {
				if card.Cmc > 9 {
					hasPositiveManaCost = true
					break
				}
			} else {
				if manaCostValue, err := strconv.ParseFloat(posManaCost, 64); err == nil {
					if card.Cmc == manaCostValue {
						hasPositiveManaCost = true
						break
					}
				}
			}
		}
		if !hasPositiveManaCost {
			return false
		}
	}

	// Check negative mana costs
	for _, negManaCost := range negativeManaCosts {
		if negManaCost == "infinite" {
			if card.Cmc > 9 {
				return false
			}
		} else {
			if manaCostValue, err := strconv.ParseFloat(negManaCost, 64); err == nil {
				if card.Cmc == manaCostValue {
					return false
				}
			}
		}
	}

	return true
}

// passesSetFilter checks if a card passes the set filtering criteria
func passesSetFilter(card *model.MtgCard, setFilters []*model.MtgFilterSetInput) bool {
	if len(setFilters) == 0 {
		return true
	}

	positiveSets := make([]string, 0)
	negativeSets := make([]string, 0)

	for _, setFilter := range setFilters {
		switch setFilter.Value {
		case model.TernaryBooleanTrue:
			positiveSets = append(positiveSets, strings.ToLower(setFilter.Set))
		case model.TernaryBooleanFalse:
			negativeSets = append(negativeSets, strings.ToLower(setFilter.Set))
		}
	}

	// Check positive sets
	if len(positiveSets) > 0 {
		hasPositiveSet := false
		for _, posSet := range positiveSets {
			for _, version := range card.Versions {
				if strings.EqualFold(version.Set, posSet) {
					hasPositiveSet = true
					break
				}
			}
			if hasPositiveSet {
				break
			}
		}
		if !hasPositiveSet {
			return false
		}
	}

	// Check negative sets
	for _, negSet := range negativeSets {
		for _, version := range card.Versions {
			if strings.EqualFold(version.Set, negSet) {
				return false
			}
		}
	}

	return true
}

// passesCardTypeFilter checks if a card passes the card type filtering criteria
func passesCardTypeFilter(card *model.MtgCard, cardTypeFilters []*model.MtgFilterCardTypeInput) bool {
	if len(cardTypeFilters) == 0 {
		return true
	}

	positiveCardTypes := make([]string, 0)
	negativeCardTypes := make([]string, 0)

	for _, cardTypeFilter := range cardTypeFilters {
		switch cardTypeFilter.Value {
		case model.TernaryBooleanTrue:
			positiveCardTypes = append(positiveCardTypes, cardTypeFilter.CardType)
		case model.TernaryBooleanFalse:
			negativeCardTypes = append(negativeCardTypes, cardTypeFilter.CardType)
		}
	}

	// Check positive card types
	if len(positiveCardTypes) > 0 {
		hasPositiveCardType := false
		for _, posCardType := range positiveCardTypes {
			if strings.Contains(strings.ToLower(card.TypeLine), strings.ToLower(posCardType)) {
				hasPositiveCardType = true
				break
			}
		}
		if !hasPositiveCardType {
			return false
		}
	}

	// Check negative card types
	for _, negCardType := range negativeCardTypes {
		if strings.Contains(strings.ToLower(card.TypeLine), strings.ToLower(negCardType)) {
			return false
		}
	}

	return true
}

// passesLayoutFilter checks if a card passes the layout filtering criteria
func passesLayoutFilter(card *model.MtgCard, layoutFilters []*model.MtgFilterLayoutInput) bool {
	if len(layoutFilters) == 0 {
		return true
	}

	positiveLayouts := make([]model.MtgLayout, 0)
	negativeLayouts := make([]model.MtgLayout, 0)

	for _, layoutFilter := range layoutFilters {
		switch layoutFilter.Value {
		case model.TernaryBooleanTrue:
			positiveLayouts = append(positiveLayouts, layoutFilter.Layout)
		case model.TernaryBooleanFalse:
			negativeLayouts = append(negativeLayouts, layoutFilter.Layout)
		}
	}

	// Check positive layouts
	if len(positiveLayouts) > 0 {
		hasPositiveLayout := false
		for _, posLayout := range positiveLayouts {
			if card.Layout == posLayout {
				hasPositiveLayout = true
				break
			}
		}
		if !hasPositiveLayout {
			return false
		}
	}

	// Check negative layouts
	for _, negLayout := range negativeLayouts {
		if card.Layout == negLayout {
			return false
		}
	}

	return true
}

// passesGameFilter checks if a card passes the game filtering criteria
func passesGameFilter(card *model.MtgCard, gameFilters []*model.MtgFilterGameInput) bool {
	if len(gameFilters) == 0 {
		return true
	}

	positiveGames := make([]model.MtgGame, 0)
	negativeGames := make([]model.MtgGame, 0)

	for _, gameFilter := range gameFilters {
		switch gameFilter.Value {
		case model.TernaryBooleanTrue:
			positiveGames = append(positiveGames, gameFilter.Game)
		case model.TernaryBooleanFalse:
			negativeGames = append(negativeGames, gameFilter.Game)
		}
	}

	// Check positive games
	if len(positiveGames) > 0 {
		hasPositiveGame := false
		for _, posGame := range positiveGames {
			for _, version := range card.Versions {
				for _, game := range version.Games {
					if game == posGame {
						hasPositiveGame = true
						break
					}
				}
				if hasPositiveGame {
					break
				}
			}
			if hasPositiveGame {
				break
			}
		}
		if !hasPositiveGame {
			return false
		}
	}

	// Check negative games
	for _, negGame := range negativeGames {
		for _, version := range card.Versions {
			for _, game := range version.Games {
				if game == negGame {
					return false
				}
			}
		}
	}

	return true
}

// passesTagFilter checks if a card passes the tag filtering criteria
func passesTagFilter(card *model.MtgCard, tagFilters []*model.MtgFilterTagInput) bool {
	if len(tagFilters) == 0 {
		return true
	}

	positiveTags := make([]string, 0)
	negativeTags := make([]string, 0)

	for _, tagFilter := range tagFilters {
		switch tagFilter.Value {
		case model.TernaryBooleanTrue:
			positiveTags = append(positiveTags, tagFilter.Tag)
		case model.TernaryBooleanFalse:
			negativeTags = append(negativeTags, tagFilter.Tag)
		}
	}

	// Check positive tags
	if len(positiveTags) > 0 {
		hasPositiveTag := false
		for _, posTag := range positiveTags {
			// Check CardTags
			for _, cardTag := range card.CardTags {
				if strings.EqualFold(cardTag.Name, posTag) || strings.EqualFold(cardTag.ID, posTag) {
					hasPositiveTag = true
					break
				}
			}
			if hasPositiveTag {
				break
			}
			// Check DeckTags
			for _, deckTag := range card.DeckTags {
				if strings.EqualFold(deckTag.Name, posTag) || strings.EqualFold(deckTag.ID, posTag) {
					hasPositiveTag = true
					break
				}
			}
			if hasPositiveTag {
				break
			}
		}
		if !hasPositiveTag {
			return false
		}
	}

	// Check negative tags
	for _, negTag := range negativeTags {
		// Check CardTags
		for _, cardTag := range card.CardTags {
			if strings.EqualFold(cardTag.Name, negTag) || strings.EqualFold(cardTag.ID, negTag) {
				return false
			}
		}
		// Check DeckTags
		for _, deckTag := range card.DeckTags {
			if strings.EqualFold(deckTag.Name, negTag) || strings.EqualFold(deckTag.ID, negTag) {
				return false
			}
		}
	}

	return true
}

// passesRatingFilter checks if a card passes the rating filtering criteria
func passesRatingFilter(card *model.MtgCard, ratingFilter *model.MtgFilterRatingInput) bool {
	if ratingFilter == nil {
		return true
	}

	// Get the card's rating
	if card.MyRating == nil {
		// If no rating exists, only pass if no minimum is set
		return ratingFilter.Min == nil
	}

	rating := card.MyRating.Value

	// Check minimum rating
	if ratingFilter.Min != nil && rating < *ratingFilter.Min {
		return false
	}

	// Check maximum rating
	if ratingFilter.Max != nil && rating > *ratingFilter.Max {
		return false
	}

	return true
}

// applySorting applies sorting to the filtered cards
func applySorting(cards []*model.MtgCard, sortInputs []*model.MtgFilterSortInput) []*model.MtgCard {
	if len(sortInputs) == 0 {
		return cards
	}

	// Filter enabled sorts
	enabledSorts := make([]*model.MtgFilterSortInput, 0)
	for _, sortInput := range sortInputs {
		if sortInput.Enabled {
			enabledSorts = append(enabledSorts, sortInput)
		}
	}

	if len(enabledSorts) == 0 {
		return cards
	}

	// Create a copy to avoid modifying the original slice
	sortedCards := make([]*model.MtgCard, len(cards))
	copy(sortedCards, cards)

	// Sort using Go's sort.Slice with custom comparison
	sort.Slice(sortedCards, func(i, j int) bool {
		cardA := sortedCards[i]
		cardB := sortedCards[j]

		// Apply each sort criteria in order
		for _, sortCriteria := range enabledSorts {
			comparison := compareBySortCriteria(cardA, cardB, sortCriteria)
			if comparison != 0 {
				return comparison < 0
			}
		}
		return false // Equal
	})

	return sortedCards
}

// compareBySortCriteria compares two cards based on a sort criteria
// Returns: -1 if cardA < cardB, 1 if cardA > cardB, 0 if equal
func compareBySortCriteria(cardA, cardB *model.MtgCard, sortCriteria *model.MtgFilterSortInput) int {
	isDesc := sortCriteria.SortDirection == model.MtgFilterSortDirectionDesc

	var comparison int

	switch sortCriteria.SortBy {
	case model.MtgFilterSortByName:
		nameA := cardA.Name
		nameB := cardB.Name

		// Handle "A-" prefix like in TypeScript
		if strings.HasPrefix(nameA, "A-") {
			nameA = nameA[2:] + "2"
		}
		if strings.HasPrefix(nameB, "A-") {
			nameB = nameB[2:] + "2"
		}

		comparison = strings.Compare(nameA, nameB)

	case model.MtgFilterSortByCmc:
		if cardA.Cmc < cardB.Cmc {
			comparison = -1
		} else if cardA.Cmc > cardB.Cmc {
			comparison = 1
		} else {
			comparison = 0
		}

	case model.MtgFilterSortByColor:
		comparison = compareByColor(cardA, cardB)

	case model.MtgFilterSortByRarity:
		rarityA := getRarityValue(cardA)
		rarityB := getRarityValue(cardB)
		comparison = rarityA - rarityB

	case model.MtgFilterSortByType:
		typeA := getTypeValue(cardA)
		typeB := getTypeValue(cardB)
		comparison = typeA - typeB

	case model.MtgFilterSortBySet:
		setA := getSetReleaseDate(cardA)
		setB := getSetReleaseDate(cardB)
		if setA < setB {
			comparison = -1
		} else if setA > setB {
			comparison = 1
		} else {
			comparison = 0
		}

	case model.MtgFilterSortByReleasedAt:
		dateA := getReleasedAtValue(cardA, isDesc)
		dateB := getReleasedAtValue(cardB, isDesc)
		if dateA < dateB {
			comparison = -1
		} else if dateA > dateB {
			comparison = 1
		} else {
			comparison = 0
		}

	default:
		comparison = 0
	}

	// Reverse comparison if descending
	if isDesc {
		comparison = -comparison
	}

	return comparison
}

// compareByColor implements the complex color sorting logic from TypeScript
func compareByColor(cardA, cardB *model.MtgCard) int {
	// First, check if it's a land (lands come after non-lands)
	isLandA := strings.Contains(cardA.TypeLine, "Land") && !strings.Contains(cardA.TypeLine, "//")
	isLandB := strings.Contains(cardB.TypeLine, "Land") && !strings.Contains(cardB.TypeLine, "//")

	if isLandA && !isLandB {
		return 1
	}
	if !isLandA && isLandB {
		return -1
	}

	// Second, sort by color identity length
	colorLenA := len(cardA.ColorIdentity)
	colorLenB := len(cardB.ColorIdentity)
	if colorLenA != colorLenB {
		return colorLenA - colorLenB
	}

	// Third, sort by color identity string
	colorStrA := getColorIdentityString(cardA.ColorIdentity)
	colorStrB := getColorIdentityString(cardB.ColorIdentity)
	if colorStrA != colorStrB {
		return strings.Compare(colorStrA, colorStrB)
	}

	// Fourth, basic lands come before non-basic lands
	isBasicA := strings.Contains(cardA.TypeLine, "Basic Land") && !strings.Contains(cardA.TypeLine, "//")
	isBasicB := strings.Contains(cardB.TypeLine, "Basic Land") && !strings.Contains(cardB.TypeLine, "//")

	if isBasicA && !isBasicB {
		return -1
	}
	if !isBasicA && isBasicB {
		return 1
	}

	return 0
}

// getColorIdentityString converts color identity to a sortable string
func getColorIdentityString(colors []model.MtgColor) string {
	colorStr := ""
	for _, color := range colors {
		colorStr += string(colorToValue(color))
	}
	return colorStr
}

// colorToValue converts a color to a sortable character (matching TypeScript)
func colorToValue(color model.MtgColor) rune {
	switch color {
	case model.MtgColorC:
		return 'A'
	case model.MtgColorW:
		return 'B'
	case model.MtgColorU:
		return 'C'
	case model.MtgColorR:
		return 'D'
	case model.MtgColorB:
		return 'E'
	case model.MtgColorG:
		return 'F'
	default:
		return 'Z'
	}
}

// getRarityValue converts rarity to a sortable integer (matching TypeScript)
func getRarityValue(card *model.MtgCard) int {
	defaultVersion := getDefaultVersion(card)
	if defaultVersion == nil {
		return 0
	}

	switch defaultVersion.Rarity {
	case model.MtgRarityCommon:
		return 0
	case model.MtgRarityUncommon:
		return 1
	case model.MtgRarityRare:
		return 2
	case model.MtgRarityMythic:
		return 3
	default:
		return 0
	}
}

// getTypeValue calculates a type value based on the type line (matching TypeScript)
func getTypeValue(card *model.MtgCard) int {
	types := make(map[string]bool)
	for _, t := range strings.Fields(card.TypeLine) {
		types[t] = true
	}

	value := 0
	for typeName := range types {
		value += typeToValue(typeName)
	}
	return value
}

// typeToValue converts a type name to a numeric value (matching TypeScript)
func typeToValue(typeName string) int {
	switch typeName {
	case "Artifact":
		return 1
	case "Basic":
		return 2
	case "Battle":
		return 3
	case "Creature":
		return 4
	case "Enchantment":
		return 5
	case "Instant":
		return 6
	case "Kindred":
		return 7
	case "Land":
		return 8
	case "Legendary":
		return 9
	case "Planeswalker":
		return 10
	case "Snow":
		return 11
	case "Sorcery":
		return 12
	default:
		return 0
	}
}

// getSetReleaseDate gets the release date for set sorting
func getSetReleaseDate(card *model.MtgCard) int64 {
	// For now, use the default version's release date
	// In the future, this could be enhanced to match against expansions
	defaultVersion := getDefaultVersion(card)
	if defaultVersion == nil {
		return 0
	}

	if releaseDate, err := time.Parse("2006-01-02", defaultVersion.ReleasedAt); err == nil {
		return releaseDate.Unix()
	}
	return 0
}

// getReleasedAtValue gets the release date value based on sort direction
func getReleasedAtValue(card *model.MtgCard, isDesc bool) int64 {
	if len(card.Versions) == 0 {
		return 0
	}

	dates := make([]int64, 0, len(card.Versions))
	for _, version := range card.Versions {
		if releaseDate, err := time.Parse("2006-01-02", version.ReleasedAt); err == nil {
			dates = append(dates, releaseDate.Unix())
		}
	}

	if len(dates) == 0 {
		return 0
	}

	// Return min for ASC, max for DESC (logic from TypeScript)
	if isDesc {
		max := dates[0]
		for _, date := range dates[1:] {
			if date > max {
				max = date
			}
		}
		return max
	} else {
		min := dates[0]
		for _, date := range dates[1:] {
			if date < min {
				min = date
			}
		}
		return min
	}
}

// getDefaultVersion gets the default version of a card
func getDefaultVersion(card *model.MtgCard) *model.MtgCardVersion {
	for _, version := range card.Versions {
		if version.IsDefault {
			return version
		}
	}
	if len(card.Versions) > 0 {
		return card.Versions[0]
	}
	return nil
}
