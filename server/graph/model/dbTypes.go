package model

// MTGApplicationConfig stores housekeeping information such as last fetch timestamps.
type MTGApplicationConfig struct {
	ID              string `json:"_key"`
	LastTimeFetched int    `json:"last_time_fetched"`
}

// MTGDeckDB is the persisted form of a deck document in ArangoDB.
type MTGDeckDB struct {
	ID    string     `json:"_key"`
	Name  string     `json:"name"`
	Zones []FlowZone `json:"zones"`
	Type  DeckType   `json:"type"`
}

// MTGDeckFrontCardImageDB is an edge storing the chosen front image for a deck.
type MTGDeckFrontCardImageDB struct {
	ID        string `json:"_id"`
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
	MainOrSide        MainOrSide      `json:"mainOrSide"`
	DeckCardType      MtgDeckCardType `json:"deckCardType"`
	Phantoms          []Phantom       `json:"phantoms"`
	SelectedVersionID *string         `json:"selectedVersionID"`
}

// TagDB is the persisted tag document which can be a CardTag or DeckTag.
type TagDB struct {
	ID          string      `json:"_key,omitempty"`
	Type        TagType     `json:"type"`
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Colors      []*MtgColor `json:"colors,omitempty"`
}

// UserRatingDB is the edge storing a user's rating for a card or a tag.
type UserRatingDB struct {
	From  string `json:"_from"` // User
	To    string `json:"_to"`   // Card or Tag
	Value int    `json:"value"`
}

// ConvertMtgColorSlice converts []*MtgColor to a value slice to ease JSON marshalling.
func ConvertMtgColorSlice(colors []*MtgColor) []MtgColor {
	result := make([]MtgColor, len(colors))
	for i, c := range colors {
		result[i] = *c
	}
	return result
}
