package mtgCardSearch

import (
	"context"
	"strconv"
	"strings"
	"sync"

	"magic-helper/arango"
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

// CardIndex holds indices for fast card filtering.
type CardIndex struct {
	mutex sync.RWMutex

	// All cards cached in memory
	AllCards []*model.MtgCard

	// Timestamp of last update
	LastUpdated int64
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

// UpdateCardInIndex updates a single card in the index after ratings or tags change.
func UpdateCardInIndex(ctx context.Context, cardID string) error {
	log.Info().Msg("Updating card index...")

	aq := arango.NewQuery( /* aql */ `
		FOR doc IN MTG_Cards
			FILTER doc._key == @cardID
			LET rating = FIRST(
				FOR node, ratingEdge IN 1..1 INBOUND doc MTG_User_Rating
				RETURN {
					user: node,
					value: ratingEdge.value
				}
			)
			LET cardTags = (
				FOR tag, tagEdge IN 1..1 INBOUND doc MTG_Tag_CardDeck
				FILTER tag.type == "CardTag"
				LET cardTagRating = FIRST(
					FOR node, ratingEdge IN 1..1 INBOUND tag MTG_User_Rating
					RETURN {
						user: node,
						value: ratingEdge.value
					}
				)
				RETURN MERGE(tag, {
					myRating: cardTagRating
				})
			)
			LET deckTags = (
				FOR tag, tagEdge IN 1..1 INBOUND doc MTG_Tag_CardDeck
				FILTER tag.type == "DeckTag"
				LET cardTagRating = FIRST(
					FOR node, ratingEdge IN 1..1 INBOUND tag MTG_User_Rating
					RETURN {
						user: node,
						value: ratingEdge.value
					}
				)
				RETURN MERGE(tag, {
					myRating: cardTagRating
				})
			)
			RETURN MERGE(doc, {
				myRating: rating,
				cardTags: cardTags,
				deckTags: deckTags
			})
	`)

	aq.AddBindVar("cardID", cardID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error updating card index")
		return err
	}

	defer cursor.Close()
	var card model.MtgCard
	for cursor.HasMore() {
		_, err := cursor.ReadDocument(ctx, &card)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading card document")
			return err
		}
	}

	index := GetCardIndex()
	index.mutex.Lock()
	defer index.mutex.Unlock()

	for i, c := range index.AllCards {
		if c.ID == card.ID {
			index.AllCards[i] = &card
			break
		}
	}

	return nil
}

// BuildCardIndexWithCards builds the card index from provided cards.
func BuildCardIndexWithCards(cards []*model.MtgCard) error {
	log.Info().Msg("Building card index for faster filtering...")

	index := GetCardIndex()
	index.mutex.Lock()
	defer index.mutex.Unlock()

	// Build indices
	index.AllCards = cards

	index.LastUpdated = int64(util.Now())

	log.Info().
		Int("total_cards", len(index.AllCards)).
		Msg("Card index built successfully")

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
