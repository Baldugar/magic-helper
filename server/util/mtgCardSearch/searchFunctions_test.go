package mtgCardSearch

import (
	"strings"
	"testing"

	"magic-helper/graph/model"
)

func TestComputeRelevanceScore_NameDominatesOracle(t *testing.T) {
	cardExact := buildTestCard("card-1", "Mystic Tutor", "Instant", "Search your library for a card", nil, nil, "ema", "2021-03-19")
	cardOracle := buildTestCard("card-2", "Arcane Mentor", "Instant", "Search your library for a mystic tutor", nil, nil, "ema", "2021-03-19")

	tokens := []string{"mystic", "tutor"}

	scoreExact := computeRelevanceScore(newCardDocument(cardExact), tokens, "mystic tutor")
	scoreOracle := computeRelevanceScore(newCardDocument(cardOracle), tokens, "mystic tutor")

	if scoreExact <= scoreOracle {
		t.Fatalf("expected exact-name score (%f) to exceed oracle score (%f)", scoreExact, scoreOracle)
	}
}

func TestComputeRelevanceScore_OracleBeatsType(t *testing.T) {
	cardOracle := buildTestCard("card-oracle", "Arcane Insight", "Sorcery", "Transmute target artifact", nil, nil, "abc", "2022-05-10")
	cardType := buildTestCard("card-type", "Enigmatic Relic", "Transmute Artifact", "Tap to add mana", nil, nil, "abc", "2022-05-10")

	tokens := []string{"transmute"}

	scoreOracle := computeRelevanceScore(newCardDocument(cardOracle), tokens, "")
	scoreType := computeRelevanceScore(newCardDocument(cardType), tokens, "")

	if scoreOracle <= scoreType {
		t.Fatalf("expected oracle score (%f) to exceed type score (%f)", scoreOracle, scoreType)
	}
}

func TestComputeRelevanceScore_TypeBeatsColorIdentity(t *testing.T) {
	cardType := buildTestCard("card-type", "Radiant Angel", "Creature - Angel", "Flying", nil, nil, "set1", "2020-01-01")
	cardColor := buildTestCard("card-color", "Azure Sentinel", "Creature - Soldier", "", []model.MtgColor{model.MtgColorW}, nil, "set2", "2020-01-01")

	tokens := []string{"angel", "white"}

	scoreType := computeRelevanceScore(newCardDocument(cardType), tokens, "")
	scoreColor := computeRelevanceScore(newCardDocument(cardColor), tokens, "")

	if scoreType <= scoreColor {
		t.Fatalf("expected type score (%f) to exceed color score (%f)", scoreType, scoreColor)
	}
}

func TestComputeRelevanceScore_ColorBeatsRecency(t *testing.T) {
	cardColor := buildTestCard("card-color", "Azure Adept", "Creature - Wizard", "", []model.MtgColor{model.MtgColorU}, nil, "set1", "2010-01-01")
	cardRecent := buildTestCard("card-recent", "Neutral Golem", "Artifact Creature", "", nil, nil, "set2", "2024-01-01")

	tokens := []string{"blue"}

	scoreColor := computeRelevanceScore(newCardDocument(cardColor), tokens, "")
	scoreRecent := computeRelevanceScore(newCardDocument(cardRecent), tokens, "")

	if scoreColor <= scoreRecent {
		t.Fatalf("expected color score (%f) to exceed recent-only score (%f)", scoreColor, scoreRecent)
	}
}

func TestComputeRelevanceScore_RecencyAddsScore(t *testing.T) {
	oldCard := buildTestCard("old", "Timeless Relic", "Artifact", "", nil, nil, "set1", "2005-06-15")
	newCard := buildTestCard("new", "Timeless Relic", "Artifact", "", nil, nil, "set2", "2023-06-15")

	scoreOld := computeRelevanceScore(newCardDocument(oldCard), nil, "")
	scoreNew := computeRelevanceScore(newCardDocument(newCard), nil, "")

	if scoreNew <= scoreOld {
		t.Fatalf("expected newer print score (%f) to exceed older score (%f)", scoreNew, scoreOld)
	}
}

func TestPassesLegalityFilter_Positive(t *testing.T) {
	card := buildTestCard("legal", "Alchemy Adept", "Creature", "", nil, nil, "set1", "2021-01-01")
	card.Versions[0].Legalities = map[string]any{"alchemy": "legal"}

	filter := []*model.MtgFilterLegalityInput{
		{
			Format:          "alchemy",
			LegalityEntries: []*model.MtgFilterLegalityEntryInput{{LegalityValue: "legal", Value: model.TernaryBooleanTrue}},
		},
	}

	if !passesLegalityFilter(card, filter) {
		t.Fatal("expected card to pass positive legality filter")
	}
}

func TestPassesLegalityFilter_Negative(t *testing.T) {
	card := buildTestCard("illegal", "Alchemy Adept", "Creature", "", nil, nil, "set1", "2021-01-01")
	card.Versions[0].Legalities = map[string]any{"alchemy": "restricted"}

	filter := []*model.MtgFilterLegalityInput{
		{
			Format:          "alchemy",
			LegalityEntries: []*model.MtgFilterLegalityEntryInput{{LegalityValue: "restricted", Value: model.TernaryBooleanFalse}},
		},
	}

	if passesLegalityFilter(card, filter) {
		t.Fatal("expected card with restricted status to be filtered out when excluded")
	}

	filter = []*model.MtgFilterLegalityInput{
		{
			Format:          "alchemy",
			LegalityEntries: []*model.MtgFilterLegalityEntryInput{{LegalityValue: "restricted", Value: model.TernaryBooleanTrue}},
		},
	}

	if !passesLegalityFilter(card, filter) {
		t.Fatal("expected card with restricted status to pass when explicitly requested")
	}
}

func TestFilterCards_RecencyBreaksTiesWithoutTokens(t *testing.T) {
	resetCardIndex(t)

	oldCard := buildTestCard("old", "Timeless Relic", "Artifact", "", nil, nil, "set1", "2005-06-15")
	newCard := buildTestCard("new", "Timeless Relic", "Artifact", "", nil, nil, "set2", "2023-06-15")

	filter := model.MtgFilterSearchInput{}

	results := FilterCards([]*model.MtgCard{oldCard, newCard}, filter, nil)
	if len(results) != 2 {
		t.Fatalf("expected two results, got %d", len(results))
	}

	if results[0].ID != newCard.ID {
		t.Errorf("expected newer print first, got %s", results[0].ID)
	}
}

func TestDocContainsAllTokens(t *testing.T) {
	card := buildTestCard("wizard", "Archivist", "Creature - Human Wizard", "Draw a card", []model.MtgColor{model.MtgColorU}, []string{"Flash"}, "set1", "2019-09-01")
	doc := newCardDocument(card)

	tokens := []string{"wizard", "blue"}

	if !docContainsAllTokens(doc, tokens) {
		t.Fatalf("expected tokens %v to be found in document", tokens)
	}
}

func TestDocHasNegativeSet(t *testing.T) {
	card := buildTestCard("neg-card", "Shadow Familiar", "Creature - Spirit", "", nil, nil, "NEG", "2018-04-02")
	doc := newCardDocument(card)

	negatives := map[string]struct{}{"neg": {}}

	if !docHasNegativeSet(doc, negatives) {
		t.Fatalf("expected negative set detection for %v", doc.SetCodes)
	}
}

// resetCardIndex clears the global card index to ensure isolated tests.
func resetCardIndex(t *testing.T) {
	idx := GetCardIndex()
	idx.mutex.Lock()
	idx.AllCards = nil
	idx.documents = make(map[string]*CardDocument)
	idx.inverted = make(map[string][]posting)
	idx.metrics = IndexMetrics{}
	idx.LastUpdated = 0
	idx.BuildDurationMs = 0
	idx.mutex.Unlock()

	t.Cleanup(func() {
		idx := GetCardIndex()
		idx.mutex.Lock()
		idx.AllCards = nil
		idx.documents = make(map[string]*CardDocument)
		idx.inverted = make(map[string][]posting)
		idx.metrics = IndexMetrics{}
		idx.LastUpdated = 0
		idx.BuildDurationMs = 0
		idx.mutex.Unlock()
	})
}

func buildTestCard(id, name, typeLine, oracle string, colors []model.MtgColor, keywords []string, setCode, released string) *model.MtgCard {
	var oraclePtr *string
	if oracle != "" {
		oraclePtr = &oracle
	}

	if keywords == nil {
		keywords = []string{}
	}

	version := &model.MtgCardVersion{
		ID:         id + "-v1",
		IsDefault:  true,
		Lang:       "en",
		Legalities: map[string]any{},
		Games:      []model.MtgGame{model.MtgGamePaper},
		Rarity:     model.MtgRarityCommon,
		ReleasedAt: released,
		Set:        setCode,
		SetName:    strings.ToUpper(setCode),
		SetType:    "core",
	}

	return &model.MtgCard{
		ID:            id,
		Name:          name,
		TypeLine:      typeLine,
		OracleText:    oraclePtr,
		ColorIdentity: colors,
		Keywords:      keywords,
		Versions:      []*model.MtgCardVersion{version},
	}
}
