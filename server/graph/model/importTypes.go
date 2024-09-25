package model

type MTGA_ImportedCard struct {
	CardFaces     []*CardFace `json:"card_faces"`
	CMC           float64     `json:"cmc"`
	ColorIdentity []string    `json:"color_identity"`
	Colors        []*string   `json:"colors"`
	FlavorText    *string     `json:"flavor_text"`
	ID            string      `json:"id"`
	ImageUris     *ImageUris  `json:"image_uris"`
	Loyalty       *string     `json:"loyalty"`
	ManaCost      *string     `json:"mana_cost"`
	Name          string      `json:"name"`
	OracleText    *string     `json:"oracle_text"`
	Power         *string     `json:"power"`
	ProducedMana  []*string   `json:"produced_mana"`
	Rarity        string      `json:"rarity"`
	Set           string      `json:"set"`
	SetName       string      `json:"set_name"`
	Toughness     *string     `json:"toughness"`
	TypeLine      string      `json:"type_line"`
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
