package model

// MTGApplicationConfig stores housekeeping information such as last fetch timestamps.
type MTGApplicationConfig struct {
	ID              string `json:"_key"`
	LastTimeFetched int    `json:"last_time_fetched"`
}

// MTGDeckDB is the persisted form of a deck document in ArangoDB.
type MTGDeckDB struct {
	ID    *string    `json:"_key,omitempty"`
	Name  string     `json:"name"`
	Zones []FlowZone `json:"zones"`
	Type  DeckType   `json:"type"`
}

// MTGDeckFrontCardImageDB is an edge storing the chosen front image for a deck.
type MTGDeckFrontCardImageDB struct {
	ID        string `json:"_key,omitempty"`
	From      string `json:"_from"`
	To        string `json:"_to"`
	VersionID string `json:"versionID"`
}

// MTGCardDeckDB is an edge that connects a card to a deck with metadata.
type MTGCardDeckDB struct {
	From              string          `json:"_from"`
	To                string          `json:"_to"`
	Count             int             `json:"count"`
	Position          Position        `json:"position"`
	DeckCardType      MtgDeckCardType `json:"deckCardType"`
	Phantoms          []Phantom       `json:"phantoms"`
	SelectedVersionID *string         `json:"selectedVersionID"`
}

// ConvertMtgColorSlice converts []*MtgColor to a value slice to ease JSON marshalling.
func ConvertMtgColorSlice(colors []*MtgColor) []MtgColor {
	result := make([]MtgColor, len(colors))
	for i, c := range colors {
		result[i] = *c
	}
	return result
}

type MTGFilterPresetDB struct {
	ID      *string               `json:"_key,omitempty"`
	DeckID  string                `json:"deckID"`
	Name    string                `json:"name"`
	SavedAt string                `json:"savedAt"`
	Filter  map[string]any        `json:"filter"`
	Sort    []*MtgFilterSortState `json:"sort"`
	Page    int                   `json:"page"`
}

func (db *MTGFilterPresetDB) ToModel() *MtgFilterPreset {
	if db == nil {
		return nil
	}
	return &MtgFilterPreset{
		ID:      *db.ID,
		DeckID:  db.DeckID,
		Name:    db.Name,
		SavedAt: db.SavedAt,
		Filter:  db.Filter,
		Sort:    db.Sort,
		Page:    db.Page,
	}
}

func SortInputToState(input []*MtgFilterSortInput) []*MtgFilterSortState {
	if input == nil {
		return nil
	}
	states := make([]*MtgFilterSortState, 0, len(input))
	for _, item := range input {
		if item == nil {
			continue
		}
		states = append(states, &MtgFilterSortState{
			SortBy:        item.SortBy,
			SortDirection: item.SortDirection,
			Enabled:       item.Enabled,
		})
	}
	return states
}
