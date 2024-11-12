package model

type MTGA_ImportedCard struct {
	CardFaces     []*CardFace       `json:"card_faces"`
	CMC           float64           `json:"cmc"`
	ColorIdentity []string          `json:"color_identity"`
	Colors        []*string         `json:"colors"`
	FlavorText    *string           `json:"flavor_text"`
	ID            string            `json:"id"`
	ImageUris     *ImageUris        `json:"image_uris"`
	Layout        string            `json:"layout"`
	Legalities    map[string]string `json:"legalities"`
	Loyalty       *string           `json:"loyalty"`
	ManaCost      *string           `json:"mana_cost"`
	Name          string            `json:"name"`
	OracleText    *string           `json:"oracle_text"`
	Power         *string           `json:"power"`
	ProducedMana  []*string         `json:"produced_mana"`
	Rarity        string            `json:"rarity"`
	Set           string            `json:"set"`
	SetName       string            `json:"set_name"`
	Toughness     *string           `json:"toughness"`
	TypeLine      string            `json:"type_line"`
}

type CardFace struct {
	Colors       []*string  `json:"colors"`
	FlavorText   *string    `json:"flavor_text"`
	ImageUris    *ImageUris `json:"image_uris"`
	Loyalty      *string    `json:"loyalty"`
	ManaCost     string     `json:"mana_cost"`
	Name         string     `json:"name"`
	OracleText   *string    `json:"oracle_text"`
	Power        *string    `json:"power"`
	ProducedMana []*string  `json:"produced_mana"`
	Toughness    *string    `json:"toughness"`
	TypeLine     string     `json:"type_line"`
}

type ImageUris struct {
	ArtCrop    string `json:"art_crop"`
	BorderCrop string `json:"border_crop"`
	Large      string `json:"large"`
	Normal     string `json:"normal"`
	Small      string `json:"small"`
	PNG        string `json:"png"`
}

type MTGA_ImportedSet struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	MTGOCode      *string `json:"mtgo_code"`
	ArenaCode     *string `json:"arena_code"`
	TCGPlayerID   *int    `json:"tcgplayer_id"`
	Name          string  `json:"name"`
	SetType       string  `json:"set_type"`
	ReleasedAt    *string `json:"released_at"`
	BlockCode     *string `json:"block_code"`
	Block         *string `json:"block"`
	ParentSetCode *string `json:"parent_set_code"`
	CardCount     int     `json:"card_count"`
	PrintedSize   *int    `json:"printed_size"`
	Digital       bool    `json:"digital"`
	FoilOnly      bool    `json:"foil_only"`
	NonFoilOnly   bool    `json:"nonfoil_only"`
	ScryfallURI   string  `json:"scryfall_uri"`
	URI           string  `json:"uri"`
	IconSVGURI    string  `json:"icon_svg_uri"`
	SearchURI     string  `json:"search_uri"`
}

type MTGA_Set struct {
	ID            string  `json:"_key"`
	Code          string  `json:"code"`
	MTGOCode      *string `json:"MTGOCode"`
	ArenaCode     *string `json:"ArenaCode"`
	TCGPlayerID   *int    `json:"TCGPlayerID"`
	Name          string  `json:"name"`
	SetType       string  `json:"setType"`
	ReleasedAt    *string `json:"releasedAt"`
	BlockCode     *string `json:"blockCode"`
	Block         *string `json:"block"`
	ParentSetCode *string `json:"parentSetCode"`
	CardCount     int     `json:"cardCount"`
	PrintedSize   *int    `json:"printedSize"`
	Digital       bool    `json:"digital"`
	FoilOnly      bool    `json:"foilOnly"`
	NonFoilOnly   bool    `json:"nonFoilOnly"`
	ScryfallURI   string  `json:"scryfallURI"`
	URI           string  `json:"URI"`
	IconSVGURI    string  `json:"iconSVGURI"`
	SearchURI     string  `json:"searchURI"`
}
