package scryfall

import scryfallModel "magic-helper/graph/model/scryfall/model"

type MTG_SetDB struct {
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
	ETag          string  `json:"eTag"`
}

type MTG_CardDB struct {
	ID             string               `json:"_key"`
	Layout         scryfallModel.Layout `json:"layout"`
	CMC            float64              `json:"cmc"`
	ColorIdentity  []string             `json:"color_identity"`
	ColorIndicator *[]string            `json:"color_indicator"`
	Colors         *[]string            `json:"colors"`
	EDHRecRank     *int                 `json:"edhrec_rank"`
	Keywords       []string             `json:"keywords"`
	Loyalty        *string              `json:"loyalty"`
	ManaCost       *string              `json:"mana_cost"`
	Name           string               `json:"name"`
	OracleText     *string              `json:"oracle_text"`
	Power          *string              `json:"power"`
	ProducedMana   *[]string            `json:"produced_mana"`
	Toughness      *string              `json:"toughness"`
	TypeLine       string               `json:"type_line"`
	Versions       []MTG_CardVersionDB  `json:"versions"`
}

type MTG_CardVersionDB struct {
	ID          string                     `json:"id"`
	IsDefault   bool                       `json:"is_default"`
	IsAlchemy   bool                       `json:"is_alchemy"`
	Artist      *string                    `json:"artist"`
	Lang        scryfallModel.CardLanguage `json:"lang"`
	FlavorName  *string                    `json:"flavor_name"`
	FlavorText  *string                    `json:"flavor_text"`
	CardFaces   *[]MTG_CardVersionFaceDB   `json:"card_faces"`
	Legalities  map[string]string          `json:"legalities"`
	Games       []scryfallModel.Game       `json:"games"`
	ImageUris   *ImageUris                 `json:"image_uris"`
	Rarity      scryfallModel.Rarity       `json:"rarity"`
	ReleasedAt  string                     `json:"released_at"`
	Reprint     bool                       `json:"reprint"`
	SetName     string                     `json:"set_name"`
	SetType     string                     `json:"set_type"`
	Set         string                     `json:"set"`
	SetID       string                     `json:"set_id"`
	Variation   bool                       `json:"variation"`
	VariationOf *string                    `json:"variation_of"`
}

type MTG_CardVersionFaceDB struct {
	Artist         *string    `json:"artist"`
	CMC            *float64   `json:"cmc"`
	ColorIndicator *[]string  `json:"color_indicator"`
	Colors         *[]string  `json:"colors"`
	FlavorText     *string    `json:"flavor_text"`
	ImageUris      *ImageUris `json:"image_uris"`
	Layout         *string    `json:"layout"`
	Loyalty        *string    `json:"loyalty"`
	ManaCost       string     `json:"mana_cost"`
	Name           string     `json:"name"`
	OracleText     *string    `json:"oracle_text"`
	Power          *string    `json:"power"`
	Toughness      *string    `json:"toughness"`
	TypeLine       *string    `json:"type_line"`
}
