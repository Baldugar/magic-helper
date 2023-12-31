// Code generated by github.com/99designs/gqlgen, DO NOT EDIT.

package model

import (
	"fmt"
	"io"
	"strconv"
)

type CardFace struct {
	Colors       []Color    `json:"colors,omitempty"`
	FlavorText   *string    `json:"flavor_text,omitempty"`
	ImageUris    *ImageUris `json:"image_uris,omitempty"`
	Loyalty      *string    `json:"loyalty,omitempty"`
	ManaCost     string     `json:"mana_cost"`
	Name         string     `json:"name"`
	OracleText   string     `json:"oracle_text"`
	Power        *string    `json:"power,omitempty"`
	ProducedMana []Color    `json:"produced_mana,omitempty"`
	Toughness    *string    `json:"toughness,omitempty"`
	TypeLine     *string    `json:"type_line,omitempty"`
}

type CreateUserInput struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
}

type CreateUserReturn struct {
	Status  bool    `json:"status"`
	Message *string `json:"message,omitempty"`
	User    *User   `json:"user,omitempty"`
}

type GetTagsReturn struct {
	CardTags []*Tag `json:"cardTags"`
	DeckTags []*Tag `json:"deckTags"`
}

type GetUserCardsParams struct {
	UserID string `json:"userID"`
}

type ImageUris struct {
	Small      string `json:"small"`
	Normal     string `json:"normal"`
	Large      string `json:"large"`
	Png        string `json:"png"`
	ArtCrop    string `json:"art_crop"`
	BorderCrop string `json:"border_crop"`
}

type LoginInput struct {
	UserID string `json:"userID"`
}

type MTGACard struct {
	CardFaces     []*CardFace `json:"card_faces,omitempty"`
	Cmc           int         `json:"cmc"`
	ColorIdentity []Color     `json:"color_identity"`
	Colors        []Color     `json:"colors,omitempty"`
	FlavorText    *string     `json:"flavor_text,omitempty"`
	ID            string      `json:"id"`
	ImageUris     *ImageUris  `json:"image_uris,omitempty"`
	Loyalty       *string     `json:"loyalty,omitempty"`
	ManaCost      *string     `json:"mana_cost,omitempty"`
	Name          string      `json:"name"`
	OracleText    *string     `json:"oracle_text,omitempty"`
	Power         *string     `json:"power,omitempty"`
	ProducedMana  []Color     `json:"produced_mana,omitempty"`
	Rarity        Rarity      `json:"rarity"`
	Set           string      `json:"set"`
	SetName       string      `json:"set_name"`
	Toughness     *string     `json:"toughness,omitempty"`
	TypeLine      string      `json:"type_line"`
}

type MutationResponse struct {
	Status  bool    `json:"status"`
	Message *string `json:"message,omitempty"`
}

type Tag struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Colors      []Color `json:"colors"`
	TagType     TagType `json:"tagType"`
}

type TagInput struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Colors      []Color `json:"colors"`
	TagType     TagType `json:"tagType"`
}

type UpdateUserCardMetaInput struct {
	UserID  string `json:"userID"`
	CardID  string `json:"cardID"`
	Comment string `json:"comment"`
	Rating  int    `json:"rating"`
}

type User struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Roles     []Role `json:"roles"`
	CreatedAt int    `json:"createdAt"`
	UpdatedAt int    `json:"updatedAt"`
	DeletedAt *int   `json:"deletedAt,omitempty"`
}

type Color string

const (
	ColorC Color = "C"
	ColorW Color = "W"
	ColorU Color = "U"
	ColorB Color = "B"
	ColorR Color = "R"
	ColorG Color = "G"
)

var AllColor = []Color{
	ColorC,
	ColorW,
	ColorU,
	ColorB,
	ColorR,
	ColorG,
}

func (e Color) IsValid() bool {
	switch e {
	case ColorC, ColorW, ColorU, ColorB, ColorR, ColorG:
		return true
	}
	return false
}

func (e Color) String() string {
	return string(e)
}

func (e *Color) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = Color(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid Color", str)
	}
	return nil
}

func (e Color) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type Rarity string

const (
	RarityCommon   Rarity = "common"
	RarityUncommon Rarity = "uncommon"
	RarityRare     Rarity = "rare"
	RarityMythic   Rarity = "mythic"
)

var AllRarity = []Rarity{
	RarityCommon,
	RarityUncommon,
	RarityRare,
	RarityMythic,
}

func (e Rarity) IsValid() bool {
	switch e {
	case RarityCommon, RarityUncommon, RarityRare, RarityMythic:
		return true
	}
	return false
}

func (e Rarity) String() string {
	return string(e)
}

func (e *Rarity) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = Rarity(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid Rarity", str)
	}
	return nil
}

func (e Rarity) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type Role string

const (
	RoleAdmin  Role = "ADMIN"
	RoleGm     Role = "GM"
	RolePlayer Role = "PLAYER"
)

var AllRole = []Role{
	RoleAdmin,
	RoleGm,
	RolePlayer,
}

func (e Role) IsValid() bool {
	switch e {
	case RoleAdmin, RoleGm, RolePlayer:
		return true
	}
	return false
}

func (e Role) String() string {
	return string(e)
}

func (e *Role) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = Role(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid Role", str)
	}
	return nil
}

func (e Role) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type TagType string

const (
	TagTypeCard TagType = "CARD"
	TagTypeDeck TagType = "DECK"
)

var AllTagType = []TagType{
	TagTypeCard,
	TagTypeDeck,
}

func (e TagType) IsValid() bool {
	switch e {
	case TagTypeCard, TagTypeDeck:
		return true
	}
	return false
}

func (e TagType) String() string {
	return string(e)
}

func (e *TagType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = TagType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid TagType", str)
	}
	return nil
}

func (e TagType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
