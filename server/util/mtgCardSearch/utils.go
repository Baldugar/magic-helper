package mtgCardSearch

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

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

// CardIndex holds indices for fast card filtering and scoring.
type CardIndex struct {
	mutex sync.RWMutex

	// All cards cached in memory for compatibility with legacy callers.
	AllCards []*model.MtgCard

	// Fast lookup structures for query execution.
	documents map[string]*CardDocument
	inverted  map[string][]posting

	// Metrics for observability.
	metrics IndexMetrics

	// Timestamp of last update and build duration (in milliseconds).
	LastUpdated     int64
	BuildDurationMs int64
}

// IndexMetrics captures statistics about the current in-memory inverted index.
type IndexMetrics struct {
	TotalDocuments int
	UniqueTerms    int
	TotalPostings  int
}

// fieldMask represents which fields contributed to a posting.
type fieldMask uint8

const (
	fieldName fieldMask = 1 << iota
	fieldOracle
	fieldTypeLine
	fieldSubtype
	fieldColorIdentity
	fieldKeyword
)

// posting stores term-level information for a card.
type posting struct {
	cardID    string
	fields    fieldMask
	frequency int
}

// tokenFrequency tracks token counts per field.
type tokenFrequency map[string]uint16

// CardDocument caches normalized data needed for scoring and filtering.
type CardDocument struct {
	Card              *model.MtgCard
	NormalizedName    string
	NameTokens        tokenFrequency
	OracleTokens      tokenFrequency
	TypeTokens        tokenFrequency
	SubtypeTokens     tokenFrequency
	ColorTokens       []string
	KeywordTokens     []string
	SetCodes          []string
	LatestReleaseUnix int64
}

// defaultStopwords contains a minimal list used to de-noise tokens.
var defaultStopwords = map[string]struct{}{
	"a":   {},
	"an":  {},
	"the": {},
	"of":  {},
	"and": {},
	"or":  {},
	"to":  {},
	"for": {},
	"in":  {},
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
		cardIndex = &CardIndex{
			documents: make(map[string]*CardDocument),
			inverted:  make(map[string][]posting),
		}
	}
	return cardIndex
}

func normalizeText(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func tokenize(value string) []string {
	if value == "" {
		return nil
	}
	value = strings.ToLower(value)
	result := make([]string, 0, 8)
	var builder strings.Builder
	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			builder.WriteRune(r)
			continue
		}
		if builder.Len() == 0 {
			continue
		}
		token := builder.String()
		builder.Reset()
		if _, stop := defaultStopwords[token]; stop {
			continue
		}
		result = append(result, token)
	}
	if builder.Len() > 0 {
		token := builder.String()
		if _, stop := defaultStopwords[token]; !stop {
			result = append(result, token)
		}
	}
	return result
}

func buildTokenFrequency(tokens []string) tokenFrequency {
	if len(tokens) == 0 {
		return make(tokenFrequency)
	}
	freq := make(tokenFrequency, len(tokens))
	for _, token := range tokens {
		if token == "" {
			continue
		}
		freq[token]++
	}
	return freq
}

func buildTokenFrequencyFromSlice(values []string) tokenFrequency {
	if len(values) == 0 {
		return make(tokenFrequency)
	}
	freq := make(tokenFrequency, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		freq[value]++
	}
	return freq
}

func addField(builder map[string]map[string]*posting, freq tokenFrequency, cardID string, mask fieldMask) {
	if len(freq) == 0 {
		return
	}
	for token, count := range freq {
		if token == "" {
			continue
		}
		perCard := builder[token]
		if perCard == nil {
			perCard = make(map[string]*posting)
			builder[token] = perCard
		}
		entry, ok := perCard[cardID]
		if !ok {
			entry = &posting{cardID: cardID}
			perCard[cardID] = entry
		}
		entry.fields |= mask
		entry.frequency += int(count)
	}
}

func newCardDocument(card *model.MtgCard) *CardDocument {
	doc := &CardDocument{
		Card:           card,
		NormalizedName: normalizeText(card.Name),
	}
	doc.NameTokens = buildTokenFrequency(tokenize(card.Name))
	if card.OracleText != nil {
		doc.OracleTokens = buildTokenFrequency(tokenize(*card.OracleText))
	} else {
		doc.OracleTokens = make(tokenFrequency)
	}
	types, subtypes := util.SplitTypeLine(card.TypeLine)
	doc.TypeTokens = buildTokenFrequency(tokenize(strings.Join(types, " ")))
	doc.SubtypeTokens = buildTokenFrequency(tokenize(strings.Join(subtypes, " ")))
	doc.ColorTokens = uniqueLowerColors(card.ColorIdentity)
	doc.KeywordTokens = uniqueLowerStrings(card.Keywords)
	doc.SetCodes = uniqueLowerSetCodes(card.Versions)
	doc.LatestReleaseUnix = latestRelease(card.Versions)
	return doc
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

// UpdateCardInIndex updates a single card in the index after ratings or tags change.
func UpdateCardInIndex(ctx context.Context, cardID string) error {
	log.Info().Str("card_id", cardID).Msg("Updating card index...")

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

	if card.ID == "" {
		log.Warn().Str("card_id", cardID).Msg("Card not found for index update")
		return nil
	}

	index := GetCardIndex()
	index.mutex.RLock()
	existingCards := append([]*model.MtgCard(nil), index.AllCards...)
	index.mutex.RUnlock()

	updated := false
	for i, existing := range existingCards {
		if existing != nil && existing.ID == card.ID {
			cardCopy := card
			existingCards[i] = &cardCopy
			updated = true
			break
		}
	}

	if !updated {
		cardCopy := card
		existingCards = append(existingCards, &cardCopy)
	}

	return BuildCardIndexWithCards(existingCards)
}

// BuildCardIndexWithCards builds the card index from provided cards.
func BuildCardIndexWithCards(cards []*model.MtgCard) error {
	log.Info().Int("total_cards", len(cards)).Msg("Building card inverted index...")
	startedAt := time.Now()

	// Prepare builder containers outside of the lock to reduce contention.
	documents := make(map[string]*CardDocument, len(cards))
	postingsBuilder := make(map[string]map[string]*posting)

	for _, card := range cards {
		if card == nil || card.ID == "" {
			continue
		}
		doc := newCardDocument(card)
		documents[card.ID] = doc

		addField(postingsBuilder, doc.NameTokens, card.ID, fieldName)
		addField(postingsBuilder, doc.OracleTokens, card.ID, fieldOracle)
		addField(postingsBuilder, doc.TypeTokens, card.ID, fieldTypeLine)
		addField(postingsBuilder, doc.SubtypeTokens, card.ID, fieldSubtype)
		addField(postingsBuilder, buildTokenFrequencyFromSlice(doc.ColorTokens), card.ID, fieldColorIdentity)
		addField(postingsBuilder, buildTokenFrequencyFromSlice(doc.KeywordTokens), card.ID, fieldKeyword)
	}

	finalPostings := make(map[string][]posting, len(postingsBuilder))
	totalPostings := 0
	for token, perCard := range postingsBuilder {
		if len(perCard) == 0 {
			continue
		}
		list := make([]posting, 0, len(perCard))
		for _, entry := range perCard {
			list = append(list, *entry)
		}
		sort.Slice(list, func(i, j int) bool {
			if list[i].frequency == list[j].frequency {
				return list[i].cardID < list[j].cardID
			}
			return list[i].frequency > list[j].frequency
		})
		finalPostings[token] = list
		totalPostings += len(list)
	}

	buildDuration := time.Since(startedAt)

	index := GetCardIndex()
	index.mutex.Lock()
	index.AllCards = append([]*model.MtgCard(nil), cards...)
	index.documents = documents
	index.inverted = finalPostings
	index.metrics = IndexMetrics{
		TotalDocuments: len(cards),
		UniqueTerms:    len(finalPostings),
		TotalPostings:  totalPostings,
	}
	index.LastUpdated = int64(util.Now())
	index.BuildDurationMs = buildDuration.Milliseconds()
	index.mutex.Unlock()

	log.Info().
		Int("total_cards", len(cards)).
		Int("unique_terms", len(finalPostings)).
		Int("postings", totalPostings).
		Dur("build_duration", buildDuration).
		Msg("Card inverted index built successfully")

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
