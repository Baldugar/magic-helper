package model

type MTGApplicationConfig struct {
	ID              string `json:"_key"`
	LastTimeFetched int    `json:"last_time_fetched"`
}

type MTGDeckDB struct {
	ID    string     `json:"_key"`
	Name  string     `json:"name"`
	Zones []FlowZone `json:"zones"`
	Type  DeckType   `json:"type"`
}

type MTGDeckFrontCardImageDB struct {
	ID   string `json:"_id"`
	From string `json:"_from"`
	To   string `json:"_to"`
}

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

type TagDB struct {
	ID          string      `json:"_key,omitempty"`
	Type        TagType     `json:"type"`
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Colors      []*MtgColor `json:"colors,omitempty"`
}

type UserRatingDB struct {
	From  string `json:"_from"` // User
	To    string `json:"_to"`   // Card or Tag
	Value int    `json:"value"`
}

func ConvertMtgColorSlice(colors []*MtgColor) []MtgColor {
	result := make([]MtgColor, len(colors))
	for i, c := range colors {
		result[i] = *c
	}
	return result
}
