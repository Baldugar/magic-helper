package model

import (
	scryfallModel "magic-helper/graph/model/scryfall/model"
)

type ScryfallCard struct {
	// Core Card Fields
	ArenaID           *int                       `json:"arena_id"`            // This card's Arena ID, if any. A large percentage of cards are not available on Arena and do not have this ID.
	ID                string                     `json:"id"`                  // A unique ID for this card in Scryfall's database.
	Lang              scryfallModel.CardLanguage `json:"lang"`                // A language code for this printing.
	MtgoID            *int                       `json:"mtgo_id"`             // This card's Magic Online ID (also known as the Catalog ID), if any. A large percentage of cards are not available on Magic Online and do not have this ID.
	MtgoFoilID        *int                       `json:"mtgo_foil_id"`        // This card's foil Magic Online ID (also known as the Catalog ID), if any. A large percentage of cards are not available on Magic Online and do not have this ID.
	MultiverseIDs     []int                      `json:"multiverse_ids"`      // This card's multiverse IDs on Gatherer, if any, as an array of integers. Note that Scryfall includes many promo cards, tokens, and other esoteric objects that do not have these identifiers.
	TcgplayerID       *int                       `json:"tcgplayer_id"`        // This card's ID on TCGplayer's API, also known as the productId. (https://docs.tcgplayer.com/docs/welcome)
	TcgplayerEtchedID *int                       `json:"tcgplayer_etched_id"` // This card's ID on TCGplayer's API, for its etched version if that version is a separate product. (https://docs.tcgplayer.com/docs/welcome)
	CardmarketID      *int                       `json:"cardmarket_id"`       // This card's ID on Cardmarket's API, also known as the idProduct. (https://api.cardmarket.com/ws/documentation)
	Object            scryfallModel.CardObject   `json:"object"`              // A content type for this object, always card.
	Layout            scryfallModel.Layout       `json:"layout"`              // A code for this card's layout.
	OracleID          *string                    `json:"oracle_id"`           // A unique ID for this card's oracle identity. This value is consistent across reprinted card editions, and unique among different cards with the same name (tokens, Unstable variants, etc). Always present except for the reversible_card layout where it will be absent; oracle_id will be found on each face instead.
	PrintsSearchURI   string                     `json:"prints_search_uri"`   // A link to where you can begin paginating all re/prints for this card on Scryfall's API.
	RulingsURI        string                     `json:"rulings_uri"`         // A link to this card's rulings list on Scryfall's API.
	ScryfallURI       string                     `json:"scryfall_uri"`        // A link to this card's permapage on Scryfall's website.
	URI               string                     `json:"uri"`                 // A link to this card object on Scryfall's API.

	// Gameplay Fields
	AllParts       []*RelatedCard         `json:"all_parts"`       // If this card is closely related to other cards, this property will be an array with Related Card Objects.
	CardFaces      []*CardFace            `json:"card_faces"`      // An array of Card Face objects, if this card is multifaced.
	CMC            float64                `json:"cmc"`             // The card's mana value. Note that some funny cards have fractional mana costs.
	ColorIdentity  []scryfallModel.Color  `json:"color_identity"`  // This card's color identity.
	ColorIndicator *[]scryfallModel.Color `json:"color_indicator"` // The colors in this card's color indicator, if any. A null value for this field indicates the card does not have one.
	Colors         *[]scryfallModel.Color `json:"colors"`          // This card's colors, if the overall card has colors defined by the rules. Otherwise the colors will be on the card_faces objects.
	Defense        *string                `json:"defense"`         // This face's defense, if any.
	EDHRecRank     *int                   `json:"edhrec_rank"`     // This card's overall rank/popularity on EDHREC. Not all cards are ranked.
	GameChanger    *bool                  `json:"game_changer"`    // True if this card is on the Commander Game Changer list.
	HandModifier   *string                `json:"hand_modifier"`   // This card's hand modifier, if it is Vanguard card. This value will contain a delta, such as -1.
	Keywords       []string               `json:"keywords"`        // An array of keywords that this card uses, such as 'Flying' and 'Cumulative upkeep'.
	Legalities     map[string]string      `json:"legalities"`      // An object describing the legality of this card across play formats. Possible legalities are legal, not_legal, restricted, and banned.
	LifeModifier   *string                `json:"life_modifier"`   // This card's life modifier, if it is Vanguard card. This value will contain a delta, such as +2.
	Loyalty        *string                `json:"loyalty"`         // This loyalty if any. Note that some cards have loyalties that are not numeric, such as X.
	ManaCost       *string                `json:"mana_cost"`       // The mana cost for this card. This value will be any empty string "" if the cost is absent. Remember that per the game rules, a missing mana cost and a mana cost of {0} are different values. Multi-faced cards will report this value in card faces.
	Name           string                 `json:"name"`            // The name of this card. If this card has multiple faces, this field will contain both names separated by ␣//␣.
	OracleText     *string                `json:"oracle_text"`     // The Oracle text for this card, if any.
	Oversized      bool                   `json:"oversized"`       // True if this card is oversized.
	PennyRank      *int                   `json:"penny_rank"`      // This card's rank/popularity on Penny Dreadful. Not all cards are ranked.
	Power          *string                `json:"power"`           // This card's power, if any. Note that some cards have powers that are not numeric, such as \*.
	ProducedMana   []string               `json:"produced_mana"`   // Colors of mana this card could produce. Nullable.
	Reserved       bool                   `json:"reserved"`        // True if this card is on the Reserved List.
	Toughness      *string                `json:"toughness"`       // This card's toughness, if any.
	TypeLine       string                 `json:"type_line"`       // The type line of this card.

	// Print Fields
	Artist           *string       `json:"artist"`            // The name of the illustrator of this card. Newly spoiled cards may not have this field yet.
	ArtistIDs        []string      `json:"artist_ids"`        // The IDs of the illustrators of this card. Newly spoiled cards may not have this field yet. Nullable array.
	AttractionLights []int         `json:"attraction_lights"` // The lit Unfinity attractions lights on this card, if any. Nullable array.
	Booster          bool          `json:"booster"`           // True if this card is found in boosters.
	BorderColor      string        `json:"border_color"`      // This card's border color: black, white, borderless, silver, or gold.
	CardBackID       string        `json:"card_back_id"`      // The Scryfall ID for the card back design present on this card.
	CollectorNumber  string        `json:"collector_number"`  // This card's collector number. Note that collector numbers can contain non-numeric characters, such as letters or ★.
	ContentWarning   bool          `json:"content_warning"`   // True if this card was flagged as having sensitive content.
	Digital          bool          `json:"digital"`           // True if this card was only released in a video game.
	Finishes         []string      `json:"finishes"`          // An array of computer-readable flags for the finishes applied to this card. Values: foil, nonfoil, etched, glossy.
	FlavorName       *string       `json:"flavor_name"`       // The just-for-flavor name printed on the card (such as for Godzilla series cards).
	FlavorText       *string       `json:"flavor_text"`       // The flavor text, if any.
	FrameEffects     []string      `json:"frame_effects"`     // This card's frame effects, if any. Nullable array.
	Frame            string        `json:"frame"`             // This card's frame layout.
	FullArt          bool          `json:"full_art"`          // True if this card's artwork is larger than normal.
	Games            []string      `json:"games"`             // A list of games that this card print is available in paper, arena, and/or mtgo.
	HighresImage     bool          `json:"highres_image"`     // True if this card has a high-resolution image available.
	IllustrationID   *string       `json:"illustration_id"`   // A unique identifier for the card artwork that remains consistent across reprints. Newly spoiled cards may not have this field yet.
	ImageStatus      string        `json:"image_status"`      // A computer-readable indicator for the state of this card's image generation. One of missing, placeholder, lowres, or highres_scan.
	ImageUris        *ImageUris    `json:"image_uris"`        // An object listing available imagery for this card. See the Card Imagery article for more information.
	Prices           *Prices       `json:"prices"`            // An object containing daily price information for this card, including usd, usd_foil, usd_etched, eur, eur_foil, eur_etched, and tix prices, as strings.
	PrintedName      *string       `json:"printed_name"`      // The localized name printed on this card, if any.
	PrintedText      *string       `json:"printed_text"`      // The localized text printed on this card, if any.
	PrintedTypeLine  *string       `json:"printed_type_line"` // The localized type line printed on this card, if any.
	Promo            bool          `json:"promo"`             // True if this card is a promotional print.
	PromoTypes       []string      `json:"promo_types"`       // An array of strings describing what categories of promo cards this card falls into. Nullable array.
	PurchaseUris     *PurchaseUris `json:"purchase_uris"`     // An object providing URIs to this card's listing on major marketplaces. Omitted if the card is unpurchaseable.
	Rarity           string        `json:"rarity"`            // This card's rarity. One of common, uncommon, rare, special, mythic, or bonus.
	RelatedUris      *RelatedUris  `json:"related_uris"`      // An object providing URIs to this card's listing on other Magic: The Gathering online resources.
	ReleasedAt       string        `json:"released_at"`       // The date this card was first released.
	Reprint          bool          `json:"reprint"`           // True if this card is a reprint.
	ScryfallSetURI   string        `json:"scryfall_set_uri"`  // A link to this card's set on Scryfall's website.
	SetName          string        `json:"set_name"`          // This card's full set name.
	SetSearchURI     string        `json:"set_search_uri"`    // A link to where you can begin paginating this card's set on the Scryfall API.
	SetType          string        `json:"set_type"`          // The type of set this printing is in.
	SetURI           string        `json:"set_uri"`           // A link to this card's set object on Scryfall's API.
	Set              string        `json:"set"`               // This card's set code.
	SetID            string        `json:"set_id"`            // This card's Set object UUID.
	StorySpotlight   bool          `json:"story_spotlight"`   // True if this card is a Story Spotlight.
	Textless         bool          `json:"textless"`          // True if the card is printed without text.
	Variation        bool          `json:"variation"`         // Whether this card is a variation of another printing.
	VariationOf      *string       `json:"variation_of"`      // The printing ID of the printing this card is a variation of.
	SecurityStamp    *string       `json:"security_stamp"`    // The security stamp on this card, if any. One of oval, triangle, acorn, circle, arena, or heart.
	Watermark        *string       `json:"watermark"`         // This card's watermark, if any.
	Preview          *Preview      `json:"preview"`           // Preview information for this card, if it was previewed.
}

type MTG_ImportedCard struct {
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
	ReleasedAt    string            `json:"released_at"`
	ScryfallURL   string            `json:"scryfall_uri"`
	Set           string            `json:"set"`
	SetName       string            `json:"set_name"`
	Toughness     *string           `json:"toughness"`
	TypeLine      string            `json:"type_line"`
}

type CardFace struct {
	Artist          *string    `json:"artist"`            // The name of the illustrator of this card face. Newly spoiled cards may not have this field yet.
	ArtistID        *string    `json:"artist_id"`         // The ID of the illustrator of this card face. Newly spoiled cards may not have this field yet.
	CMC             *float64   `json:"cmc"`               // The mana value of this particular face, if the card is reversible.
	ColorIndicator  []string   `json:"color_indicator"`   // The colors in this face's color indicator, if any. Nullable array.
	Colors          []string   `json:"colors"`            // This face's colors, if the game defines colors for the individual face of this card. Nullable array.
	Defense         *string    `json:"defense"`           // This face's defense, if any.
	FlavorText      *string    `json:"flavor_text"`       // The flavor text printed on this face, if any.
	IllustrationID  *string    `json:"illustration_id"`   // A unique identifier for the card face artwork that remains consistent across reprints. Newly spoiled cards may not have this field yet.
	ImageUris       *ImageUris `json:"image_uris"`        // An object providing URIs to imagery for this face, if this is a double-sided card. If this card is not double-sided, then the image_uris property will be part of the parent object instead.
	Layout          *string    `json:"layout"`            // The layout of this card face, if the card is reversible.
	Loyalty         *string    `json:"loyalty"`           // This face's loyalty, if any.
	ManaCost        string     `json:"mana_cost"`         // The mana cost for this face. This value will be any empty string "" if the cost is absent. Remember that per the game rules, a missing mana cost and a mana cost of {0} are different values.
	Name            string     `json:"name"`              // The name of this particular face.
	Object          string     `json:"object"`            // A content type for this object, always card_face.
	OracleID        *string    `json:"oracle_id"`         // The Oracle ID of this particular face, if the card is reversible.
	OracleText      *string    `json:"oracle_text"`       // The Oracle text for this face, if any.
	Power           *string    `json:"power"`             // This face's power, if any. Note that some cards have powers that are not numeric, such as \*.
	PrintedName     *string    `json:"printed_name"`      // The localized name printed on this face, if any.
	PrintedText     *string    `json:"printed_text"`      // The localized text printed on this face, if any.
	PrintedTypeLine *string    `json:"printed_type_line"` // The localized type line printed on this face, if any.
	Toughness       *string    `json:"toughness"`         // This face's toughness, if any.
	TypeLine        string     `json:"type_line"`         // The type line of this particular face, if the card is reversible.
	Watermark       *string    `json:"watermark"`         // The watermark on this particulary card face, if any.
}

type ImageUris struct {
	ArtCrop    string `json:"art_crop"`
	BorderCrop string `json:"border_crop"`
	Large      string `json:"large"`
	Normal     string `json:"normal"`
	Small      string `json:"small"`
	PNG        string `json:"png"`
}

type Prices struct {
	USD       *string `json:"usd"`        // Price in US dollars.
	USDFoil   *string `json:"usd_foil"`   // Price in US dollars (foil).
	USDEtched *string `json:"usd_etched"` // Price in US dollars (etched).
	EUR       *string `json:"eur"`        // Price in Euros.
	EURFoil   *string `json:"eur_foil"`   // Price in Euros (foil).
	EUREtched *string `json:"eur_etched"` // Price in Euros (etched).
	Tix       *string `json:"tix"`        // Price in MTGO tickets.
}

type RelatedCard struct {
	ID        string                             `json:"id"`        // An unique ID for this card in Scryfall's database.
	Object    string                             `json:"object"`    // A content type for this object, always related_card.
	Component scryfallModel.RelatedCardComponent `json:"component"` // A field explaining what role this card plays in this relationship, one of token, meld_part, meld_result, or combo_piece.
	Name      string                             `json:"name"`      // The name of this particular related card.
	TypeLine  string                             `json:"type_line"` // The type line of this card.
	URI       string                             `json:"uri"`       // A URI where you can retrieve a full object describing this card on Scryfall's API.
}

type PurchaseUris struct {
	TCGPlayer   *string `json:"tcgplayer"`   // Link to TCGplayer.
	Cardmarket  *string `json:"cardmarket"`  // Link to Cardmarket.
	Cardhoarder *string `json:"cardhoarder"` // Link to Cardhoarder.
}

type RelatedUris struct {
	Gatherer                  *string `json:"gatherer"`                    // Link to Gatherer.
	TCGPlayerInfiniteArticles *string `json:"tcgplayer_infinite_articles"` // Link to TCGplayer Infinite articles.
	TCGPlayerInfiniteDecks    *string `json:"tcgplayer_infinite_decks"`    // Link to TCGplayer Infinite decks.
	EDHRec                    *string `json:"edhrec"`                      // Link to EDHREC.
}

type Preview struct {
	PreviewedAt *string `json:"previewed_at"` // The date this card was previewed.
	SourceURI   *string `json:"source_uri"`   // A link to the preview for this card.
	Source      *string `json:"source"`       // The name of the source that previewed this card.
}
