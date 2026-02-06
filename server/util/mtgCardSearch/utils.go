package mtgCardSearch

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

// QueryType represents the different types of queries.
type QueryType string

const (
	QueryTypeCardType   QueryType = "CardType"
	QueryTypeRarity     QueryType = "Rarity"
	QueryTypeSearch     QueryType = "search"
	QueryTypeSet        QueryType = "Set"
	QueryTypeCMCEq      QueryType = "CMC="
	QueryTypeCMCGt      QueryType = "CMC>"
	QueryTypeCMCLt      QueryType = "CMC<"
	QueryTypeCMCGtEq    QueryType = "CMC>="
	QueryTypeCMCLtEq    QueryType = "CMC<="
	QueryTypeColor      QueryType = "Color"
	QueryTypeOracle     QueryType = "Oracle"
	QueryTypeFlavorText QueryType = "FlavorText"
)

// Query represents a parsed query with its type, value, and negation flag.
type Query struct {
	Type  QueryType
	Value any // Can be string, int, []model.MtgColor, or model.MtgRarity
	Not   bool
}

// CardProvider interface to avoid import cycle.
type CardProvider interface {
	GetMTGCards(ctx context.Context) ([]*model.MtgCard, error)
}

// CardIndex holds the in-memory card map for fast access (no token index).
type CardIndex struct {
	mutex sync.RWMutex

	// All cards cached in memory.
	AllCards []*model.MtgCard

	// Timestamp of last update and build duration (in milliseconds).
	LastUpdated     int64
	BuildDurationMs int64
}

var colorNameByCode = map[string]string{
	"w": "white",
	"u": "blue",
	"b": "black",
	"r": "red",
	"g": "green",
}

// Global card index instance.
var cardIndex *CardIndex

// GetCardIndex returns the global card index, initializing it if necessary.
func GetCardIndex() *CardIndex {
	if cardIndex == nil {
		cardIndex = &CardIndex{}
	}
	return cardIndex
}

func normalizeText(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

// GetSetCodesForCard returns normalized set codes for a card (used for negative-set checks).
func GetSetCodesForCard(card *model.MtgCard) []string {
	return uniqueLowerSetCodes(card.Versions)
}

func uniqueLowerStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		token := strings.ToLower(strings.TrimSpace(value))
		if token == "" {
			continue
		}
		if _, exists := set[token]; exists {
			continue
		}
		set[token] = struct{}{}
		result = append(result, token)
	}
	sort.Strings(result)
	return result
}

func uniqueLowerColors(values []model.MtgColor) []string {
	if len(values) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(values)*2)
	for _, value := range values {
		token := strings.ToLower(strings.TrimSpace(string(value)))
		if token == "" {
			continue
		}
		set[token] = struct{}{}
		if name, ok := colorNameByCode[token]; ok {
			set[name] = struct{}{}
		}
	}
	result := make([]string, 0, len(set))
	for token := range set {
		result = append(result, token)
	}
	sort.Strings(result)
	return result
}

func uniqueLowerSetCodes(versions []*model.MtgCardVersion) []string {
	if len(versions) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(versions))
	result := make([]string, 0, len(versions))
	for _, version := range versions {
		if version == nil {
			continue
		}
		token := strings.ToLower(strings.TrimSpace(version.Set))
		if token == "" {
			continue
		}
		if _, exists := set[token]; exists {
			continue
		}
		set[token] = struct{}{}
		result = append(result, token)
	}
	sort.Strings(result)
	return result
}

func latestRelease(versions []*model.MtgCardVersion) int64 {
	var latest int64
	for _, version := range versions {
		if version == nil || version.ReleasedAt == "" {
			continue
		}
		timestamp, err := time.Parse("2006-01-02", version.ReleasedAt)
		if err != nil {
			continue
		}
		releaseUnix := timestamp.Unix()
		if releaseUnix > latest {
			latest = releaseUnix
		}
	}
	return latest
}

// LatestReleaseUnix returns the latest release timestamp for a card (for relevance scoring).
func LatestReleaseUnix(card *model.MtgCard) int64 {
	if card == nil {
		return 0
	}
	return latestRelease(card.Versions)
}

// BuildCardIndexWithCards builds the in-memory card map from provided cards (no token index).
func BuildCardIndexWithCards(cards []*model.MtgCard) error {
	log.Info().Int("total_cards", len(cards)).Msg("Building card memory map...")
	startedAt := time.Now()

	copyCards := make([]*model.MtgCard, 0, len(cards))
	for _, card := range cards {
		if card == nil || card.ID == "" {
			continue
		}
		copyCards = append(copyCards, card)
	}

	buildDuration := time.Since(startedAt)

	index := GetCardIndex()
	index.mutex.Lock()
	index.AllCards = copyCards
	index.LastUpdated = int64(util.Now())
	index.BuildDurationMs = buildDuration.Milliseconds()
	index.mutex.Unlock()

	log.Info().
		Int("total_cards", len(copyCards)).
		Dur("build_duration", buildDuration).
		Msg("Card memory map built successfully")

	return nil
}

// GetAllCardsFromIndex returns all cards from the index (with read lock).
func GetAllCardsFromIndex() []*model.MtgCard {
	index := GetCardIndex()
	index.mutex.RLock()
	defer index.mutex.RUnlock()

	if len(index.AllCards) == 0 {
		log.Warn().Msg("Card index is empty, consider rebuilding it")
		return []*model.MtgCard{}
	}

	return index.AllCards
}

// IsIndexReady checks if the card index has been built and is ready to use.
func IsIndexReady() bool {
	index := GetCardIndex()
	index.mutex.RLock()
	defer index.mutex.RUnlock()

	return len(index.AllCards) > 0
}

// UpdateCardTagAssignmentsInIndex updates the TagAssignments slice for the card with the given ID in the index.
// No-op if the index is not ready or the card is not found.
func UpdateCardTagAssignmentsInIndex(cardID string, assignments []*model.MtgTagAssignment) {
	index := GetCardIndex()
	index.mutex.Lock()
	defer index.mutex.Unlock()

	if len(index.AllCards) == 0 {
		return
	}
	for _, card := range index.AllCards {
		if card != nil && card.ID == cardID {
			if assignments == nil {
				card.TagAssignments = []*model.MtgTagAssignment{}
			} else {
				card.TagAssignments = assignments
			}
			return
		}
	}
}

// RemoveTagFromAllCardsInIndex removes the tag with the given ID from every card in the index.
// Removes tag assignments where the tag is the terminal tag, and removes from chains where it appears.
// Called when a tag is deleted so the index stays in sync with the DB.
func RemoveTagFromAllCardsInIndex(tagID string) {
	index := GetCardIndex()
	index.mutex.Lock()
	defer index.mutex.Unlock()

	if len(index.AllCards) == 0 {
		return
	}
	for _, card := range index.AllCards {
		if card == nil || card.TagAssignments == nil {
			continue
		}
		newAssignments := make([]*model.MtgTagAssignment, 0, len(card.TagAssignments))
		for _, a := range card.TagAssignments {
			if a == nil || a.Tag == nil {
				continue
			}
			// Skip assignments where the terminal tag is the one being deleted
			if a.Tag.ID == tagID {
				continue
			}
			// Remove the tag from chain if present
			newChain := make([]*model.MtgTag, 0, len(a.Chain))
			for _, ct := range a.Chain {
				if ct != nil && ct.ID != tagID {
					newChain = append(newChain, ct)
				}
			}
			a.Chain = newChain
			newAssignments = append(newAssignments, a)
		}
		card.TagAssignments = newAssignments
	}
}

func CalculateQuery(s string) Query {
	// Normalize input by converting to lowercase
	s = strings.ToLower(s)

	// Handle set queries (set: and s:)
	if strings.Contains(s, "set:") || strings.Contains(s, "s:") {
		var parts []string
		if strings.Contains(s, "set:") {
			parts = strings.Split(s, "set:")
		} else {
			parts = strings.Split(s, "s:")
		}
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}
			return Query{
				Type:  QueryTypeSet,
				Value: q,
				Not:   not,
			}
		}
	}

	// Handle type queries (t: and type:)
	if strings.Contains(s, "t:") || strings.Contains(s, "type:") {
		var parts []string
		if strings.Contains(s, "type:") {
			parts = strings.Split(s, "type:")
		} else {
			parts = strings.Split(s, "t:")
		}
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}
			return Query{
				Type:  QueryTypeCardType,
				Value: q,
				Not:   not,
			}
		}
	}

	// Handle oracle text queries (o:)
	if strings.Contains(s, "o:") {
		parts := strings.Split(s, "o:")
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}
			return Query{
				Type:  QueryTypeOracle,
				Value: q,
				Not:   not,
			}
		}
	}

	// Handle flavor text queries (ft:)
	if strings.Contains(s, "ft:") {
		parts := strings.Split(s, "ft:")
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}
			return Query{
				Type:  QueryTypeFlavorText,
				Value: q,
				Not:   not,
			}
		}
	}

	// Handle rarity queries
	if strings.Contains(s, "r:") {
		parts := strings.Split(s, "r:")
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}
			return Query{
				Type:  QueryTypeRarity,
				Value: convertToRarity(q),
				Not:   not,
			}
		}
	}

	// Handle color queries
	if strings.Contains(s, "c:") {
		parts := strings.Split(s, "c:")
		if len(parts) > 1 {
			q := strings.TrimSpace(parts[1])
			not := strings.HasPrefix(q, "!")
			if not {
				q = q[1:]
			}

			var colors []model.MtgColor
			for _, c := range q {
				color := convertToColor(string(c))
				colors = append(colors, color)
			}

			return Query{
				Type:  QueryTypeColor,
				Value: colors,
				Not:   not,
			}
		}
	}

	// Handle CMC queries
	if strings.Contains(s, "cmc") {
		// Check for exact match first
		if strings.Contains(s, "cmc:") {
			parts := strings.Split(s, "cmc:")
			if len(parts) > 1 {
				q := strings.TrimSpace(parts[1])
				not := strings.HasPrefix(q, "!")
				if not {
					q = q[1:]
				}
				if val, err := strconv.Atoi(q); err == nil {
					return Query{
						Type:  QueryTypeCMCEq,
						Value: val,
						Not:   not,
					}
				} else {
					log.Error().Msgf("Invalid CMC value: %s", q)
				}
			}
		}
		// Check for greater than or equal
		if strings.Contains(s, "cmc>=") {
			parts := strings.Split(s, "cmc>=")
			if len(parts) > 1 {
				q := strings.TrimSpace(parts[1])
				not := strings.HasPrefix(q, "!")
				if not {
					q = q[1:]
				}
				if val, err := strconv.Atoi(q); err == nil {
					return Query{
						Type:  QueryTypeCMCGtEq,
						Value: val,
						Not:   not,
					}
				} else {
					log.Error().Msgf("Invalid CMC value: %s", q)
				}
			}
		}
		// Check for greater than
		if strings.Contains(s, "cmc>") {
			parts := strings.Split(s, "cmc>")
			if len(parts) > 1 {
				q := strings.TrimSpace(parts[1])
				not := strings.HasPrefix(q, "!")
				if not {
					q = q[1:]
				}
				if val, err := strconv.Atoi(q); err == nil {
					return Query{
						Type:  QueryTypeCMCGt,
						Value: val,
						Not:   not,
					}
				} else {
					log.Error().Msgf("Invalid CMC value: %s", q)
				}
			}
		}
		// Check for less than or equal
		if strings.Contains(s, "cmc<=") {
			parts := strings.Split(s, "cmc<=")
			if len(parts) > 1 {
				q := strings.TrimSpace(parts[1])
				not := strings.HasPrefix(q, "!")
				if not {
					q = q[1:]
				}
				if val, err := strconv.Atoi(q); err == nil {
					return Query{
						Type:  QueryTypeCMCLtEq,
						Value: val,
						Not:   not,
					}
				} else {
					log.Error().Msgf("Invalid CMC value: %s", q)
				}
			}
		}
		// Check for less than
		if strings.Contains(s, "cmc<") {
			parts := strings.Split(s, "cmc<")
			if len(parts) > 1 {
				q := strings.TrimSpace(parts[1])
				not := strings.HasPrefix(q, "!")
				if not {
					q = q[1:]
				}
				if val, err := strconv.Atoi(q); err == nil {
					return Query{
						Type:  QueryTypeCMCLt,
						Value: val,
						Not:   not,
					}
				} else {
					log.Error().Msgf("Invalid CMC value: %s", q)
				}
			}
		}
	}

	// Default to search query
	q := strings.TrimSpace(s)
	not := strings.HasPrefix(q, "!")
	if not {
		q = q[1:]
	}

	return Query{
		Type:  QueryTypeSearch,
		Value: q,
		Not:   not,
	}
}

func convertToRarity(r string) model.MtgRarity {
	switch strings.ToLower(r) {
	case "common", "c":
		return model.MtgRarityCommon
	case "uncommon", "u":
		return model.MtgRarityUncommon
	case "rare", "r":
		return model.MtgRarityRare
	case "mythic", "m":
		return model.MtgRarityMythic
	default:
		return model.MtgRarityCommon
	}
}

func convertToColor(c string) model.MtgColor {
	switch strings.ToUpper(c) {
	case "W", "WHITE":
		return model.MtgColorW
	case "U", "BLUE":
		return model.MtgColorU
	case "B", "BLACK":
		return model.MtgColorB
	case "R", "RED":
		return model.MtgColorR
	case "G", "GREEN":
		return model.MtgColorG
	case "C", "COLORLESS":
		return model.MtgColorC
	default:
		return model.MtgColorC
	}
}
