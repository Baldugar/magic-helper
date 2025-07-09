package mtgCardSearch

import (
	"context"
	"strconv"
	"strings"
	"sync"

	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// QueryType represents the different types of queries
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

// Query represents a parsed query with its type, value, and negation flag
type Query struct {
	Type  QueryType
	Value interface{} // Can be string, int, []model.MtgColor, or model.MtgRarity
	Not   bool
}

// CardProvider interface to avoid import cycle
type CardProvider interface {
	GetMTGCards(ctx context.Context) ([]*model.MtgCard, error)
}

// CardIndex holds indices for fast card filtering
type CardIndex struct {
	mutex sync.RWMutex

	// All cards cached in memory
	AllCards []*model.MtgCard

	// Indices for fast lookups
	CardsByCMC    map[int][]*model.MtgCard
	CardsByRarity map[model.MtgRarity][]*model.MtgCard
	CardsByColor  map[model.MtgColor][]*model.MtgCard
	CardsBySet    map[string][]*model.MtgCard
	CardsByType   map[string][]*model.MtgCard
	CardsByLayout map[model.MtgLayout][]*model.MtgCard
	CardsByGame   map[model.MtgGame][]*model.MtgCard

	// Text search indices
	CardsByName       map[string][]*model.MtgCard
	CardsByOracleText map[string][]*model.MtgCard

	// Timestamp of last update
	LastUpdated int64
}

// Global card index instance
var cardIndex *CardIndex

// GetCardIndex returns the global card index, initializing it if necessary
func GetCardIndex() *CardIndex {
	if cardIndex == nil {
		cardIndex = &CardIndex{
			CardsByCMC:        make(map[int][]*model.MtgCard),
			CardsByRarity:     make(map[model.MtgRarity][]*model.MtgCard),
			CardsByColor:      make(map[model.MtgColor][]*model.MtgCard),
			CardsBySet:        make(map[string][]*model.MtgCard),
			CardsByType:       make(map[string][]*model.MtgCard),
			CardsByLayout:     make(map[model.MtgLayout][]*model.MtgCard),
			CardsByGame:       make(map[model.MtgGame][]*model.MtgCard),
			CardsByName:       make(map[string][]*model.MtgCard),
			CardsByOracleText: make(map[string][]*model.MtgCard),
		}
	}
	return cardIndex
}

// BuildCardIndexWithCards builds the card index from provided cards
func BuildCardIndexWithCards(cards []*model.MtgCard) error {
	log.Info().Msg("Building card index for faster filtering...")

	index := GetCardIndex()
	index.mutex.Lock()
	defer index.mutex.Unlock()

	// Clear existing indices
	index.AllCards = make([]*model.MtgCard, 0, len(cards))
	index.CardsByCMC = make(map[int][]*model.MtgCard)
	index.CardsByRarity = make(map[model.MtgRarity][]*model.MtgCard)
	index.CardsByColor = make(map[model.MtgColor][]*model.MtgCard)
	index.CardsBySet = make(map[string][]*model.MtgCard)
	index.CardsByType = make(map[string][]*model.MtgCard)
	index.CardsByLayout = make(map[model.MtgLayout][]*model.MtgCard)
	index.CardsByGame = make(map[model.MtgGame][]*model.MtgCard)
	index.CardsByName = make(map[string][]*model.MtgCard)
	index.CardsByOracleText = make(map[string][]*model.MtgCard)

	// Build indices
	for _, card := range cards {
		index.AllCards = append(index.AllCards, card)

		// CMC index
		cmc := int(card.Cmc)
		index.CardsByCMC[cmc] = append(index.CardsByCMC[cmc], card)

		// Color identity index
		for _, color := range card.ColorIdentity {
			index.CardsByColor[color] = append(index.CardsByColor[color], card)
		}

		// Layout index
		index.CardsByLayout[card.Layout] = append(index.CardsByLayout[card.Layout], card)

		// Type index (build from type line)
		typeWords := strings.Fields(strings.ToLower(card.TypeLine))
		for _, typeWord := range typeWords {
			if typeWord != "—" && typeWord != "//" {
				index.CardsByType[typeWord] = append(index.CardsByType[typeWord], card)
			}
		}

		// Name index (for fast text search)
		nameWords := strings.Fields(strings.ToLower(card.Name))
		for _, word := range nameWords {
			if len(word) >= 3 { // Only index words of 3+ characters
				index.CardsByName[word] = append(index.CardsByName[word], card)
			}
		}

		// Oracle text index
		if card.OracleText != nil {
			oracleWords := strings.Fields(strings.ToLower(*card.OracleText))
			for _, word := range oracleWords {
				if len(word) >= 3 { // Only index words of 3+ characters
					index.CardsByOracleText[word] = append(index.CardsByOracleText[word], card)
				}
			}
		}

		// Version-specific indices
		for _, version := range card.Versions {
			// Rarity index
			index.CardsByRarity[version.Rarity] = append(index.CardsByRarity[version.Rarity], card)

			// Set index
			setLower := strings.ToLower(version.Set)
			index.CardsBySet[setLower] = append(index.CardsBySet[setLower], card)

			// Game index
			for _, game := range version.Games {
				index.CardsByGame[game] = append(index.CardsByGame[game], card)
			}
		}
	}

	index.LastUpdated = getCurrentTimestamp()

	log.Info().
		Int("total_cards", len(index.AllCards)).
		Int("cmc_buckets", len(index.CardsByCMC)).
		Int("rarity_buckets", len(index.CardsByRarity)).
		Int("color_buckets", len(index.CardsByColor)).
		Int("set_buckets", len(index.CardsBySet)).
		Int("type_buckets", len(index.CardsByType)).
		Msg("Card index built successfully")

	return nil
}

// GetAllCardsFromIndex returns all cards from the index (with read lock)
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

// IsIndexReady checks if the card index has been built and is ready to use
func IsIndexReady() bool {
	index := GetCardIndex()
	index.mutex.RLock()
	defer index.mutex.RUnlock()

	return len(index.AllCards) > 0
}

// getCurrentTimestamp returns the current Unix timestamp
func getCurrentTimestamp() int64 {
	return 0 // TODO: Implement proper timestamp
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
