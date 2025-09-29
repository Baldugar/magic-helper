package scryfall

import (
	"magic-helper/graph/model"
	scryfallModel "magic-helper/graph/model/scryfall/model"
)

// MTG_SetDB is the persisted form of a set document in ArangoDB.
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

// MTG_CardDB is the persisted aggregated card document used by the app.
type MTG_CardDB struct {
	ID             string               `json:"_key"`
	Layout         scryfallModel.Layout `json:"layout"`
	CMC            float64              `json:"CMC"`
	ColorIdentity  []string             `json:"colorIdentity"`
	ColorIndicator *[]string            `json:"colorIndicator,omitempty"`
	Colors         *[]string            `json:"colors,omitempty"`
	EDHRecRank     *int                 `json:"EDHRecRank,omitempty"`
	Keywords       []string             `json:"keywords"`
	Loyalty        *string              `json:"loyalty,omitempty"`
	ManaCost       *string              `json:"manaCost,omitempty"`
	Name           string               `json:"name"`
	OracleText     *string              `json:"oracleText,omitempty"`
	Power          *string              `json:"power,omitempty"`
	ProducedMana   *[]string            `json:"producedMana,omitempty"`
	Toughness      *string              `json:"toughness,omitempty"`
	TypeLine       string               `json:"typeLine"`
	Versions       []MTG_CardVersionDB  `json:"versions"`
}

// MTG_CardVersionDB describes a specific printing/version of a card.
type MTG_CardVersionDB struct {
	ID              string                     `json:"ID"`
	Artist          *string                    `json:"artist,omitempty"`
	Booster         bool                       `json:"booster"`
	CardFaces       *[]MTG_CardVersionFaceDB   `json:"cardFaces,omitempty"`
	CollectorNumber string                     `json:"collectorNumber"`
	Finishes        []string                   `json:"finishes"`
	FlavorName      *string                    `json:"flavorName,omitempty"`
	FlavorText      *string                    `json:"flavorText,omitempty"`
	FrameEffects    *[]string                  `json:"frameEffects,omitempty"`
	FullArt         bool                       `json:"fullArt"`
	Games           []scryfallModel.Game       `json:"games"`
	ImageUris       *model.MtgImage            `json:"imageUris,omitempty"`
	IsAlchemy       bool                       `json:"isAlchemy"`
	IsDefault       bool                       `json:"isDefault"`
	Lang            scryfallModel.CardLanguage `json:"lang"`
	Legalities      map[string]string          `json:"legalities"`
	Name            string                     `json:"name"`
	PrintedName     string                     `json:"printedName"`
	PromoTypes      *[]string                  `json:"promoTypes,omitempty"`
	Rarity          scryfallModel.Rarity       `json:"rarity"`
	ReleasedAt      string                     `json:"releasedAt"`
	Reprint         bool                       `json:"reprint"`
	Set             string                     `json:"set"`
	SetID           string                     `json:"setID"`
	SetName         string                     `json:"setName"`
	SetType         string                     `json:"setType"`
	Variation       bool                       `json:"variation"`
	VariationOf     *string                    `json:"variationOf,omitempty"`
	IllustrationID  *string                    `json:"illustrationID,omitempty"`
}

// MTG_CardVersionFaceDB describes a face of a multi-faced card version.
type MTG_CardVersionFaceDB struct {
	Artist         *string         `json:"artist,omitempty"`
	CMC            *float64        `json:"CMC,omitempty"`
	ColorIndicator *[]string       `json:"colorIndicator,omitempty"`
	Colors         *[]string       `json:"colors,omitempty"`
	FlavorText     *string         `json:"flavorText,omitempty"`
	ImageUris      *model.MtgImage `json:"imageUris,omitempty"`
	Layout         *string         `json:"layout,omitempty"`
	Loyalty        *string         `json:"loyalty,omitempty"`
	ManaCost       string          `json:"manaCost"`
	Name           string          `json:"name"`
	OracleText     *string         `json:"oracleText,omitempty"`
	Power          *string         `json:"power,omitempty"`
	Toughness      *string         `json:"toughness,omitempty"`
	TypeLine       *string         `json:"typeLine,omitempty"`
}
