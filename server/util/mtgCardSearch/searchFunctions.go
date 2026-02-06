package mtgCardSearch

import (
	"container/heap"
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"slices"

	"github.com/rs/zerolog/log"
)

// FilterCardsWithPagination filters cards with a pure predicate pipeline, sorts deterministically
// (multi-level + mandatory ID tie-breaker), and returns the requested page plus total count of
// passing cards. Uses a max-heap of size K=(page+1)*pageSize to avoid sorting the full match set.
// No relevance scoring; pass/fail only.
func FilterCardsWithPagination(cards []*model.MtgCard, filter model.MtgFilterSearchInput, sortInputs []*model.MtgFilterSortInput, pagination model.MtgFilterPaginationInput) (paged []*model.MtgCard, totalCount int) {
	start := time.Now()

	ignoredIDs, _ := fetchIgnoredCards(filter)
	var ignoredForFilter []string
	if filter.HideIgnored && len(ignoredIDs) > 0 {
		ignoredForFilter = ignoredIDs
	}

	var cardUniverse []*model.MtgCard
	if len(cards) == 0 {
		if !IsIndexReady() {
			log.Warn().Msg("FilterCardsWithPagination: index not ready and no cards provided")
			return nil, 0
		}
		idx := GetCardIndex()
		idx.mutex.RLock()
		cardUniverse = append([]*model.MtgCard(nil), idx.AllCards...)
		idx.mutex.RUnlock()
	} else {
		cardUniverse = cards
	}

	if len(cardUniverse) == 0 {
		return []*model.MtgCard{}, 0
	}

	// Resolve commander once (O(n)) instead of inside passesFilter per card (was O(n^2))
	var commanderCard *model.MtgCard
	if filter.Commander != nil {
		for _, c := range cardUniverse {
			if c.ID == *filter.Commander {
				commanderCard = c
				break
			}
		}
	}

	compare := buildCompare(sortInputs, filter.HideUnreleased, filter.Games)
	K := (pagination.Page + 1) * pagination.PageSize
	if pagination.PageSize <= 0 {
		K = 0
	}

	h := &cardHeap{compare: compare}
	totalCount = 0

	for _, card := range cardUniverse {
		if card == nil {
			continue
		}
		if !passesFilter(card, filter, ignoredForFilter, commanderCard) {
			continue
		}
		totalCount++
		if K <= 0 {
			continue
		}
		if h.Len() < K {
			heap.Push(h, card)
			continue
		}
		if compare(card, (*h).cards[0]) < 0 {
			heap.Pop(h)
			heap.Push(h, card)
		}
	}

	if h.Len() == 0 {
		log.Debug().
			Int("input_cards", len(cardUniverse)).
			Int("total_count", totalCount).
			Dur("duration", time.Since(start)).
			Msg("FilterCardsWithPagination completed")
		return []*model.MtgCard{}, totalCount
	}

	slice := make([]*model.MtgCard, 0, h.Len())
	for h.Len() > 0 {
		slice = append(slice, heap.Pop(h).(*model.MtgCard))
	}
	sort.Slice(slice, func(i, j int) bool { return compare(slice[i], slice[j]) < 0 })

	offset := pagination.Page * pagination.PageSize
	end := offset + pagination.PageSize
	if offset >= len(slice) {
		paged = []*model.MtgCard{}
	} else {
		if end > len(slice) {
			end = len(slice)
		}
		paged = slice[offset:end]
	}

	log.Debug().
		Int("input_cards", len(cardUniverse)).
		Int("total_count", totalCount).
		Int("paged_len", len(paged)).
		Dur("duration", time.Since(start)).
		Msg("FilterCardsWithPagination completed")

	return paged, totalCount
}

// cardHeap is a max-heap by sort order (worst element at root) for Top-K selection.
type cardHeap struct {
	cards   []*model.MtgCard
	compare func(a, b *model.MtgCard) int
}

func (h cardHeap) Len() int { return len(h.cards) }

// Less: root is the worst in sort order (max), so we evict it when a better card arrives.
func (h cardHeap) Less(i, j int) bool { return h.compare(h.cards[i], h.cards[j]) > 0 }
func (h cardHeap) Swap(i, j int)      { h.cards[i], h.cards[j] = h.cards[j], h.cards[i] }
func (h *cardHeap) Push(x any)        { h.cards = append(h.cards, x.(*model.MtgCard)) }
func (h *cardHeap) Pop() any {
	n := len(h.cards)
	x := h.cards[n-1]
	h.cards = h.cards[:n-1]
	return x
}

// buildCompare returns a comparator: -1 if a before b, 1 if a after b, 0 if equal.
// Uses sortInputs for multi-level comparison and always ends with a.ID vs b.ID for total order.
// When hideUnreleased is true, release-date sorting uses only released versions.
// When gamesFilter is non-empty, release/rarity/set sorting use only effective versions (matching games filter).
func buildCompare(sortInputs []*model.MtgFilterSortInput, hideUnreleased bool, gamesFilter []*model.MtgFilterGameInput) func(a, b *model.MtgCard) int {
	enabled := make([]*model.MtgFilterSortInput, 0)
	for _, s := range sortInputs {
		if s != nil && s.Enabled {
			enabled = append(enabled, s)
		}
	}
	return func(a, b *model.MtgCard) int {
		for _, level := range enabled {
			cmp := compareBySortCriteria(a, b, level, hideUnreleased, gamesFilter)
			if cmp != 0 {
				return cmp
			}
		}
		if a.ID < b.ID {
			return -1
		}
		if a.ID > b.ID {
			return 1
		}
		return 0
	}
}

func fetchIgnoredCards(filter model.MtgFilterSearchInput) ([]string, map[string]struct{}) {
	if filter.DeckID == nil {
		return nil, nil
	}

	ctx := context.Background()
	aq := arango.NewQuery( /* aql */ `
		FOR card, edge IN 1..1 OUTBOUND CONCAT("mtg_decks/", @deckID) mtg_deck_ignore_card
		RETURN card._key
	`)
	aq.AddBindVar("deckID", *filter.DeckID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("FilterCardsWithPagination: error loading ignored cards")
		return nil, nil
	}
	defer cursor.Close()

	ids := make([]string, 0)
	set := make(map[string]struct{})
	for cursor.HasMore() {
		var id string
		_, err := cursor.ReadDocument(ctx, &id)
		if err != nil {
			log.Error().Err(err).Msg("FilterCardsWithPagination: error reading ignored card id")
			continue
		}
		ids = append(ids, id)
		set[id] = struct{}{}
	}

	return ids, set
}

func collectNegativeSets(filter model.MtgFilterSearchInput) map[string]struct{} {
	if len(filter.Sets) == 0 {
		return nil
	}

	negatives := make(map[string]struct{})
	for _, entry := range filter.Sets {
		if entry == nil {
			continue
		}
		if entry.Value == model.TernaryBooleanFalse {
			negatives[strings.ToLower(entry.Set)] = struct{}{}
		}
	}

	if len(negatives) == 0 {
		return nil
	}

	return negatives
}

func cardHasNegativeSet(card *model.MtgCard, negatives map[string]struct{}) bool {
	if len(negatives) == 0 || card == nil {
		return false
	}
	for _, setCode := range GetSetCodesForCard(card) {
		if _, exists := negatives[setCode]; exists {
			return true
		}
	}
	return false
}

// cardHasReleasedVersionFromVersions returns true if at least one version has ReleasedAt <= today (UTC).
func cardHasReleasedVersionFromVersions(versions []*model.MtgCardVersion) bool {
	if len(versions) == 0 {
		return false
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for _, v := range versions {
		if v == nil || v.ReleasedAt == "" {
			continue
		}
		t, err := time.Parse("2006-01-02", v.ReleasedAt)
		if err != nil {
			continue
		}
		if t.UTC().Truncate(24*time.Hour).Before(today) || t.UTC().Truncate(24*time.Hour).Equal(today) {
			return true
		}
	}
	return false
}

func containsString(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

// PaginateCards slices the input according to page and pageSize.
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

// passesFilter checks if a card passes all the filter criteria. Deterministic, pass/fail only.
// commanderCard must be pre-resolved by the caller when filter.Commander is set (avoids O(n^2) scan).
func passesFilter(card *model.MtgCard, filter model.MtgFilterSearchInput, ignoredCardIDs []string, commanderCard *model.MtgCard) bool {
	if slices.Contains(ignoredCardIDs, card.ID) {
		return false
	}

	negativeSets := collectNegativeSets(filter)
	if len(negativeSets) > 0 && cardHasNegativeSet(card, negativeSets) {
		return false
	}

	if commanderCard != nil {
		// Commander color identity restriction: card must only contain colors from commander's color identity
		// or be colorless

		if len(card.ColorIdentity) > 0 {
			// Check if the card has any colors outside the commander's color identity
			for _, cardColor := range card.ColorIdentity {
				colorAllowed := slices.Contains(commanderCard.ColorIdentity, cardColor) || cardColor == model.MtgColorC
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

	// Game filtering first: card must have at least one version matching games; then we use only those versions below
	if !passesGameFilter(card, filter.Games) {
		return false
	}

	versions := versionsToUse(card, filter.Games)

	// Rarity filtering (over effective versions only when games filter is set)
	if !passesRarityFilterWithVersions(filter.Rarity, versions) {
		return false
	}

	// Mana cost filtering
	if !passesManaCostFilter(card, filter.ManaCosts) {
		return false
	}

	// Set filtering (over effective versions)
	if !passesSetFilterWithVersions(filter.Sets, versions) {
		return false
	}

	// Legality filtering (over effective versions)
	if !passesLegalityFilterWithVersions(filter.Legalities, versions) {
		return false
	}

	// Card type filtering
	if !passesCardTypeFilter(card, filter.CardTypes) {
		return false
	}

	// Layout filtering (over effective versions)
	if !passesLayoutFilterWithVersions(card, filter.Layouts, versions) {
		return false
	}

	// Tag filtering: ternary like sets (TRUE = must have, FALSE = must not have, UNSET = ignore). Multiple TRUE = AND.
	if !passesTagFilter(card, filter.Tags) {
		return false
	}

	// Chain filtering: exact chain match (terminal tag + chain path)
	if !passesChainFilter(card, filter.Chains) {
		return false
	}

	// Hide unreleased: at least one effective version must have ReleasedAt <= today
	if filter.HideUnreleased {
		if !cardHasReleasedVersionFromVersions(versions) {
			return false
		}
	}

	return true
}

// passesSearchString checks if a card matches the search string criteria.
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
				matches := defaultSearchMatches(card, searchLower)
				if (query.Not && matches) || (!query.Not && !matches) {
					return false
				}
			}
		}
	}

	return true
}

// defaultSearchMatches reproduces client default search: name, typeLine, set, setName, oracle, flavor, and cardFaces (name, typeLine, oracle, flavor).
func defaultSearchMatches(card *model.MtgCard, searchLower string) bool {
	if strings.Contains(strings.ToLower(card.Name), searchLower) {
		return true
	}
	if strings.Contains(strings.ToLower(card.TypeLine), searchLower) {
		return true
	}
	if card.OracleText != nil && strings.Contains(strings.ToLower(*card.OracleText), searchLower) {
		return true
	}
	for _, v := range card.Versions {
		if v == nil {
			continue
		}
		if strings.EqualFold(v.Set, searchLower) || strings.Contains(strings.ToLower(v.SetName), searchLower) {
			return true
		}
		if v.FlavorText != nil && strings.Contains(strings.ToLower(*v.FlavorText), searchLower) {
			return true
		}
		for _, f := range v.CardFaces {
			if f == nil {
				continue
			}
			if strings.Contains(strings.ToLower(f.Name), searchLower) {
				return true
			}
			if f.TypeLine != nil && strings.Contains(strings.ToLower(*f.TypeLine), searchLower) {
				return true
			}
			if f.OracleText != nil && strings.Contains(strings.ToLower(*f.OracleText), searchLower) {
				return true
			}
			if f.FlavorText != nil && strings.Contains(strings.ToLower(*f.FlavorText), searchLower) {
				return true
			}
		}
	}
	return false
}

// passesColorFilter checks if a card passes the color filtering criteria.
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

// passesRarityFilterWithVersions checks rarity over the given version set (e.g. effective versions when games filter is set).
func passesRarityFilterWithVersions(rarityFilters []*model.MtgFilterRarityInput, versions []*model.MtgCardVersion) bool {
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
	if len(positiveRarities) > 0 {
		hasPositiveRarity := false
		for _, posRarity := range positiveRarities {
			for _, version := range versions {
				if version != nil && version.Rarity == posRarity {
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
	for _, negRarity := range negativeRarities {
		for _, version := range versions {
			if version != nil && version.Rarity == negRarity {
				return false
			}
		}
	}
	return true
}

// passesManaCostFilter checks if a card passes the mana cost filtering criteria.
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

// passesLegalityFilterWithVersions checks legality over the given version set.
func passesLegalityFilterWithVersions(legalityFilters []*model.MtgFilterLegalityInput, versions []*model.MtgCardVersion) bool {
	if len(legalityFilters) == 0 {
		return true
	}
	for _, legalityFilter := range legalityFilters {
		if legalityFilter == nil {
			continue
		}
		positives := make([]string, 0)
		negatives := make([]string, 0)
		for _, entry := range legalityFilter.LegalityEntries {
			if entry == nil || entry.LegalityValue == "" {
				continue
			}
			switch entry.Value {
			case model.TernaryBooleanTrue:
				positives = append(positives, strings.ToLower(entry.LegalityValue))
			case model.TernaryBooleanFalse:
				negatives = append(negatives, strings.ToLower(entry.LegalityValue))
			}
		}
		statuses := cardStatusesForFormatFromVersions(versions, legalityFilter.Format)
		if len(positives) > 0 {
			matched := false
			for _, status := range statuses {
				for _, pos := range positives {
					if status == pos {
						matched = true
						break
					}
				}
				if matched {
					break
				}
			}
			if !matched {
				return false
			}
		}
		if len(negatives) > 0 {
			for _, status := range statuses {
				for _, neg := range negatives {
					if status == neg {
						return false
					}
				}
			}
		}
	}
	return true
}

// cardStatusesForFormatFromVersions returns distinct lower-cased legality statuses for a format from the given versions.
func cardStatusesForFormatFromVersions(versions []*model.MtgCardVersion, format string) []string {
	if len(versions) == 0 || format == "" {
		return nil
	}
	format = strings.ToLower(format)
	statuses := make(map[string]struct{})
	for _, version := range versions {
		if version == nil || version.Legalities == nil {
			continue
		}
		for key, value := range version.Legalities {
			if strings.ToLower(key) != format {
				continue
			}
			status := normalizeLegalityValue(value)
			if status == "" {
				continue
			}
			statuses[status] = struct{}{}
		}
	}
	result := make([]string, 0, len(statuses))
	for status := range statuses {
		result = append(result, status)
	}
	return result
}

func normalizeLegalityValue(value any) string {
	switch v := value.(type) {
	case string:
		return strings.ToLower(strings.TrimSpace(v))
	case fmt.Stringer:
		return strings.ToLower(strings.TrimSpace(v.String()))
	default:
		return strings.ToLower(strings.TrimSpace(fmt.Sprint(v)))
	}
}

// passesSetFilterWithVersions checks set filter over the given version set.
func passesSetFilterWithVersions(setFilters []*model.MtgFilterSetInput, versions []*model.MtgCardVersion) bool {
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
	if len(positiveSets) > 0 {
		hasPositiveSet := false
		for _, posSet := range positiveSets {
			for _, version := range versions {
				if version != nil && strings.EqualFold(version.Set, posSet) {
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
	for _, negSet := range negativeSets {
		for _, version := range versions {
			if version != nil && strings.EqualFold(version.Set, negSet) {
				return false
			}
		}
	}
	return true
}

// passesCardTypeFilter checks if a card passes the card type filtering criteria.
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

// passesLayoutFilterWithVersions checks layout over the given version set (card.Layout or version cardFaces).
func passesLayoutFilterWithVersions(card *model.MtgCard, layoutFilters []*model.MtgFilterLayoutInput, versions []*model.MtgCardVersion) bool {
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
	versionHasLayout := func(v *model.MtgCardVersion, layout model.MtgLayout) bool {
		if v == nil {
			return false
		}
		if card.Layout == layout {
			return true
		}
		for _, f := range v.CardFaces {
			if f != nil && f.Layout != nil && *f.Layout == layout {
				return true
			}
		}
		return false
	}
	if len(positiveLayouts) > 0 {
		hasPositiveLayout := false
		for _, posLayout := range positiveLayouts {
			for _, v := range versions {
				if versionHasLayout(v, posLayout) {
					hasPositiveLayout = true
					break
				}
			}
			if hasPositiveLayout {
				break
			}
		}
		if !hasPositiveLayout {
			return false
		}
	}
	for _, negLayout := range negativeLayouts {
		for _, v := range versions {
			if versionHasLayout(v, negLayout) {
				return false
			}
		}
	}
	return true
}

// EffectiveVersionsForGames returns versions that match the games filter: positive = version
// must have that game, negative = version must not have that game. If gameFilters is nil or
// empty, returns card.Versions (all versions). Exported for use in resolvers when building
// response (e.g. return cards with only Arena versions to the client).
func EffectiveVersionsForGames(card *model.MtgCard, gameFilters []*model.MtgFilterGameInput) []*model.MtgCardVersion {
	return effectiveVersionsForGames(card, gameFilters)
}

func effectiveVersionsForGames(card *model.MtgCard, gameFilters []*model.MtgFilterGameInput) []*model.MtgCardVersion {
	if card == nil || len(gameFilters) == 0 {
		if card != nil {
			return card.Versions
		}
		return nil
	}
	if card.Versions == nil {
		return nil
	}
	positiveGames := make([]model.MtgGame, 0)
	negativeGames := make([]model.MtgGame, 0)
	for _, gf := range gameFilters {
		if gf == nil {
			continue
		}
		switch gf.Value {
		case model.TernaryBooleanTrue:
			positiveGames = append(positiveGames, gf.Game)
		case model.TernaryBooleanFalse:
			negativeGames = append(negativeGames, gf.Game)
		}
	}
	out := make([]*model.MtgCardVersion, 0, len(card.Versions))
	for _, v := range card.Versions {
		if v == nil {
			continue
		}
		hasPos := true
		for _, g := range positiveGames {
			found := false
			for _, vg := range v.Games {
				if vg == g {
					found = true
					break
				}
			}
			if !found {
				hasPos = false
				break
			}
		}
		if !hasPos {
			continue
		}
		hasNeg := false
		for _, g := range negativeGames {
			for _, vg := range v.Games {
				if vg == g {
					hasNeg = true
					break
				}
			}
			if hasNeg {
				break
			}
		}
		if hasNeg {
			continue
		}
		out = append(out, v)
	}
	return out
}

// versionsToUse returns the version set to use for a card: when gameFilters is non-empty,
// only versions matching the games filter; otherwise all card.Versions.
func versionsToUse(card *model.MtgCard, gameFilters []*model.MtgFilterGameInput) []*model.MtgCardVersion {
	if card == nil {
		return nil
	}
	if len(gameFilters) == 0 {
		return card.Versions
	}
	return effectiveVersionsForGames(card, gameFilters)
}

// passesGameFilter checks if a card has at least one version matching the games filter.
// When games filter is set, only those versions are considered for all other filters and sort.
func passesGameFilter(card *model.MtgCard, gameFilters []*model.MtgFilterGameInput) bool {
	if len(gameFilters) == 0 {
		return true
	}
	return len(effectiveVersionsForGames(card, gameFilters)) > 0
}

// passesTagFilter returns true if no tag filter is set, or if the card matches (ternary like sets).
// TRUE = card must have this tag (AND across all TRUE). FALSE = card must not have this tag. UNSET = ignore.
// Now checks if tag appears ANYWHERE: as terminal tag OR in any chain.
func passesTagFilter(card *model.MtgCard, tagFilters []*model.MtgFilterTagInput) bool {
	if len(tagFilters) == 0 {
		return true
	}
	// Build a set of ALL tag IDs from card (both terminal tags and chain members)
	cardTagIDs := make(map[string]struct{})
	if card.TagAssignments != nil {
		for _, assignment := range card.TagAssignments {
			if assignment == nil {
				continue
			}
			// Add the terminal tag
			if assignment.Tag != nil {
				cardTagIDs[assignment.Tag.ID] = struct{}{}
			}
			// Add all chain members (meta tags)
			for _, chainTag := range assignment.Chain {
				if chainTag != nil {
					cardTagIDs[chainTag.ID] = struct{}{}
				}
			}
		}
	}
	var positiveTagIDs, negativeTagIDs []string
	for _, entry := range tagFilters {
		if entry == nil {
			continue
		}
		switch entry.Value {
		case model.TernaryBooleanTrue:
			positiveTagIDs = append(positiveTagIDs, entry.TagID)
		case model.TernaryBooleanFalse:
			negativeTagIDs = append(negativeTagIDs, entry.TagID)
		case model.TernaryBooleanUnset:
			// ignore
		}
	}
	for _, tagID := range positiveTagIDs {
		if _, ok := cardTagIDs[tagID]; !ok {
			return false
		}
	}
	for _, tagID := range negativeTagIDs {
		if _, ok := cardTagIDs[tagID]; ok {
			return false
		}
	}
	return true
}

// passesChainFilter returns true if no chain filter is set, or if the card matches.
// Chain filter has: TerminalTagID, ChainTagIDs (array), and TernaryBoolean value.
// Build a key for each chain: "terminalID:chainID1,chainID2,..." and compare against card's exact chains.
// TRUE = card must have this exact chain, FALSE = card must not have this chain, UNSET = ignore.
func passesChainFilter(card *model.MtgCard, chainFilters []*model.MtgFilterChainInput) bool {
	if len(chainFilters) == 0 {
		return true
	}

	// Build set of chain keys from card's tag assignments
	cardChainKeys := make(map[string]struct{})
	if card.TagAssignments != nil {
		for _, assignment := range card.TagAssignments {
			if assignment == nil || assignment.Tag == nil {
				continue
			}
			key := buildChainKey(assignment.Tag.ID, assignment.Chain)
			cardChainKeys[key] = struct{}{}
		}
	}

	var positiveChainKeys, negativeChainKeys []string
	for _, entry := range chainFilters {
		if entry == nil {
			continue
		}
		key := buildChainKeyFromFilter(entry.TerminalTagID, entry.ChainTagIDs)
		switch entry.Value {
		case model.TernaryBooleanTrue:
			positiveChainKeys = append(positiveChainKeys, key)
		case model.TernaryBooleanFalse:
			negativeChainKeys = append(negativeChainKeys, key)
		case model.TernaryBooleanUnset:
			// ignore
		}
	}

	// All positive chains must be present (AND logic)
	for _, chainKey := range positiveChainKeys {
		if _, ok := cardChainKeys[chainKey]; !ok {
			return false
		}
	}

	// No negative chains should be present
	for _, chainKey := range negativeChainKeys {
		if _, ok := cardChainKeys[chainKey]; ok {
			return false
		}
	}

	return true
}

// buildChainKey creates a unique key for a chain from terminal tag ID and chain tags.
// Format: "terminalID:chainID1,chainID2,..." (chain IDs are sorted for consistency)
func buildChainKey(terminalTagID string, chainTags []*model.MtgTag) string {
	chainIDs := make([]string, 0, len(chainTags))
	for _, tag := range chainTags {
		if tag != nil {
			chainIDs = append(chainIDs, tag.ID)
		}
	}
	sort.Strings(chainIDs)
	return terminalTagID + ":" + strings.Join(chainIDs, ",")
}

// buildChainKeyFromFilter creates a unique key for a chain filter.
// Format: "terminalID:chainID1,chainID2,..." (chain IDs are sorted for consistency)
func buildChainKeyFromFilter(terminalTagID string, chainTagIDs []string) string {
	sortedIDs := make([]string, len(chainTagIDs))
	copy(sortedIDs, chainTagIDs)
	sort.Strings(sortedIDs)
	return terminalTagID + ":" + strings.Join(sortedIDs, ",")
}

// compareBySortCriteria compares two cards based on a sort criteria.
// Returns: -1 if cardA < cardB, 1 if cardA > cardB, 0 if equal.
// When hideUnreleased is true, release-date and set sorting use only released versions.
// When gamesFilter is non-empty, release/rarity/set use only effective versions.
func compareBySortCriteria(cardA, cardB *model.MtgCard, sortCriteria *model.MtgFilterSortInput, hideUnreleased bool, gamesFilter []*model.MtgFilterGameInput) int {
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
		rarityA := getRarityValueWithVersions(cardA, gamesFilter)
		rarityB := getRarityValueWithVersions(cardB, gamesFilter)
		comparison = rarityA - rarityB

	case model.MtgFilterSortByType:
		typeA := getTypeValue(cardA)
		typeB := getTypeValue(cardB)
		comparison = typeA - typeB

	case model.MtgFilterSortBySet:
		setA := getSetReleaseDateWithVersions(cardA, hideUnreleased, gamesFilter)
		setB := getSetReleaseDateWithVersions(cardB, hideUnreleased, gamesFilter)
		if setA < setB {
			comparison = -1
		} else if setA > setB {
			comparison = 1
		} else {
			comparison = 0
		}

	case model.MtgFilterSortByReleasedAt:
		dateA := getReleasedAtValueWithVersions(cardA, isDesc, hideUnreleased, gamesFilter)
		dateB := getReleasedAtValueWithVersions(cardB, isDesc, hideUnreleased, gamesFilter)
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

// compareByColor implements the complex color sorting logic from TypeScript.
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

// getColorIdentityString converts color identity to a sortable string.
func getColorIdentityString(colors []model.MtgColor) string {
	colorStr := ""
	for _, color := range colors {
		colorStr += string(colorToValue(color))
	}
	return colorStr
}

// colorToValue converts a color to a sortable character (matching TypeScript).
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

// getRarityValueWithVersions uses effective versions when gamesFilter is set, else all versions.
func getRarityValueWithVersions(card *model.MtgCard, gamesFilter []*model.MtgFilterGameInput) int {
	versions := versionsToUse(card, gamesFilter)
	defaultVersion := getDefaultVersionFromVersions(versions)
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

// getDefaultVersionFromVersions returns the default version from the slice, or the first if none marked default.
func getDefaultVersionFromVersions(versions []*model.MtgCardVersion) *model.MtgCardVersion {
	for _, v := range versions {
		if v != nil && v.IsDefault {
			return v
		}
	}
	if len(versions) > 0 && versions[0] != nil {
		return versions[0]
	}
	return nil
}

// getTypeValue calculates a type value based on the type line (matching TypeScript).
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

// typeToValue converts a type name to a numeric value (matching TypeScript).
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

// getSetReleaseDateWithVersions uses effective versions when gamesFilter is set.
// When onlyReleased is true, uses latest released version from that set; otherwise default version's date.
func getSetReleaseDateWithVersions(card *model.MtgCard, onlyReleased bool, gamesFilter []*model.MtgFilterGameInput) int64 {
	versions := versionsToUse(card, gamesFilter)
	today := time.Now().UTC().Truncate(24 * time.Hour)
	pickVersion := func(v *model.MtgCardVersion) int64 {
		if v == nil || v.ReleasedAt == "" {
			return 0
		}
		t, err := time.Parse("2006-01-02", v.ReleasedAt)
		if err != nil {
			return 0
		}
		releaseUTC := t.UTC().Truncate(24 * time.Hour)
		if onlyReleased && releaseUTC.After(today) {
			return 0
		}
		return releaseUTC.Unix()
	}
	if onlyReleased {
		var best int64
		for _, v := range versions {
			if d := pickVersion(v); d > 0 && (best == 0 || d > best) {
				best = d
			}
		}
		return best
	}
	defaultVersion := getDefaultVersionFromVersions(versions)
	if defaultVersion == nil {
		return 0
	}
	return pickVersion(defaultVersion)
}

// getReleasedAtValueWithVersions uses effective versions when gamesFilter is set.
// When onlyReleased is true, only versions with ReleasedAt <= today (UTC) are considered.
func getReleasedAtValueWithVersions(card *model.MtgCard, isDesc bool, onlyReleased bool, gamesFilter []*model.MtgFilterGameInput) int64 {
	versions := versionsToUse(card, gamesFilter)
	if len(versions) == 0 {
		return 0
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	dates := make([]int64, 0, len(versions))
	for _, version := range versions {
		if version == nil || version.ReleasedAt == "" {
			continue
		}
		t, err := time.Parse("2006-01-02", version.ReleasedAt)
		if err != nil {
			continue
		}
		releaseUTC := t.UTC().Truncate(24 * time.Hour)
		if onlyReleased && releaseUTC.After(today) {
			continue
		}
		dates = append(dates, releaseUTC.Unix())
	}
	if len(dates) == 0 {
		return 0
	}
	if isDesc {
		max := dates[0]
		for _, date := range dates[1:] {
			if date > max {
				max = date
			}
		}
		return max
	}
	min := dates[0]
	for _, date := range dates[1:] {
		if date < min {
			min = date
		}
	}
	return min
}

// getDefaultVersion gets the default version of a card.
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
