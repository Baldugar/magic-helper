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
	From         string          `json:"_from"`
	To           string          `json:"_to"`
	Count        int             `json:"count"`
	Position     Position        `json:"position"`
	MainOrSide   MainOrSide      `json:"mainOrSide"`
	DeckCardType MtgDeckCardType `json:"deckCardType"`
	Phantoms     []Phantom       `json:"phantoms"`
}
