package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

// SetType Enum Definition
type SetType string

const (
	SetTypeCore            SetType = "core"             // A yearly Magic core set (Tenth Edition, etc)
	SetTypeExpansion       SetType = "expansion"        // A rotational expansion set in a block (Zendikar, etc)
	SetTypeMasters         SetType = "masters"          // A reprint set that contains no new cards (Modern Masters, etc)
	SetTypeAlchemy         SetType = "alchemy"          // An Arena set designed for Alchemy
	SetTypeMasterpiece     SetType = "masterpiece"      // Masterpiece Series premium foil cards
	SetTypeArsenal         SetType = "arsenal"          // A Commander-oriented gift set
	SetTypeFromTheVault    SetType = "from_the_vault"   // From the Vault gift sets
	SetTypeSpellbook       SetType = "spellbook"        // Spellbook series gift sets
	SetTypePremiumDeck     SetType = "premium_deck"     // Premium Deck Series decks
	SetTypeDuelDeck        SetType = "duel_deck"        // Duel Decks
	SetTypeDraftInnovation SetType = "draft_innovation" // Special draft sets, like Conspiracy and Battlebond
	SetTypeTreasureChest   SetType = "treasure_chest"   // Magic Online treasure chest prize sets
	SetTypeCommander       SetType = "commander"        // Commander preconstructed decks
	SetTypePlanechase      SetType = "planechase"       // Planechase sets
	SetTypeArchenemy       SetType = "archenemy"        // Archenemy sets
	SetTypeVanguard        SetType = "vanguard"         // Vanguard card sets
	SetTypeFunny           SetType = "funny"            // A funny un-set or set with funny promos (Unglued, Happy Holidays, etc)
	SetTypeStarter         SetType = "starter"          // A starter/introductory set (Portal, etc)
	SetTypeBox             SetType = "box"              // A gift box set
	SetTypePromo           SetType = "promo"            // A set that contains purely promotional cards
	SetTypeToken           SetType = "token"            // A set made up of tokens and emblems.
	SetTypeMemorabilia     SetType = "memorabilia"      // A set made up of gold-bordered, oversize, or trophy cards that are not legal
	SetTypeMinigame        SetType = "minigame"         // A set that contains minigame card inserts from booster packs
)

var AllSetType = []SetType{
	SetTypeCore,
	SetTypeExpansion,
	SetTypeMasters,
	SetTypeAlchemy,
	SetTypeMasterpiece,
	SetTypeArsenal,
	SetTypeFromTheVault,
	SetTypeSpellbook,
	SetTypePremiumDeck,
	SetTypeDuelDeck,
	SetTypeDraftInnovation,
	SetTypeTreasureChest,
	SetTypeCommander,
	SetTypePlanechase,
	SetTypeArchenemy,
	SetTypeVanguard,
	SetTypeFunny,
	SetTypeStarter,
	SetTypeBox,
	SetTypePromo,
	SetTypeToken,
	SetTypeMemorabilia,
	SetTypeMinigame,
}

func (e SetType) IsValid() bool {
	for _, v := range AllSetType {
		if e == v {
			return true
		}
	}
	return false
}

func (e SetType) String() string {
	return string(e)
}

func (e *SetType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = SetType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SetType", str)
	}
	return nil
}

func (e SetType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
