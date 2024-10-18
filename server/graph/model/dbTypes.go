package model

type MTGAApplicationConfig struct {
	ID              string `json:"_key"`
	LastTimeFetched int    `json:"last_time_fetched"`
}

type MTGADeckDB struct {
	ID    string     `json:"_key"`
	Name  string     `json:"name"`
	Zones []FlowZone `json:"zones"`
	Type  DeckType   `json:"type"`
}

type MTGADeckFrontCardImageDB struct {
	ID   string `json:"_id"`
	From string `json:"_from"`
	To   string `json:"_to"`
}

type MTGACardDeckDB struct {
	From         string           `json:"_from"`
	To           string           `json:"_to"`
	Count        int              `json:"count"`
	Position     Position         `json:"position"`
	CardPosition DeckCardPosition `json:"cardPosition"`
	Type         MtgaDeckCardType `json:"type"`
}
