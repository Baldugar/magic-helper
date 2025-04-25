package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type Layout string

const (
	LayoutNormal           Layout = "normal"             // A standard Magic card with one face
	LayoutSplit            Layout = "split"              // A split-faced card
	LayoutFlip             Layout = "flip"               // Cards that invert vertically with the flip keyword
	LayoutTransform        Layout = "transform"          // Double-sided cards that transform
	LayoutModalDfc         Layout = "modal_dfc"          // Double-sided cards that can be played either-side
	LayoutMeld             Layout = "meld"               // Cards with meld parts printed on the back
	LayoutLeveler          Layout = "leveler"            // Cards with Level Up
	LayoutClass            Layout = "class"              // Class-type enchantment cards
	LayoutCase             Layout = "case"               // Case-type enchantment cards
	LayoutSaga             Layout = "saga"               // Saga-type cards
	LayoutAdventure        Layout = "adventure"          // Cards with an Adventure spell part
	LayoutMutate           Layout = "mutate"             // Cards with Mutate
	LayoutPrototype        Layout = "prototype"          // Cards with Prototype
	LayoutBattle           Layout = "battle"             // Battle-type cards
	LayoutPlanar           Layout = "planar"             // Plane and Phenomenon-type cards
	LayoutScheme           Layout = "scheme"             // Scheme-type cards
	LayoutVanguard         Layout = "vanguard"           // Vanguard-type cards
	LayoutToken            Layout = "token"              // Token cards
	LayoutDoubleFacedToken Layout = "double_faced_token" // Tokens with another token printed on the back
	LayoutEmblem           Layout = "emblem"             // Emblem cards
	LayoutAugment          Layout = "augment"            // Cards with Augment
	LayoutHost             Layout = "host"               // Host-type cards
	LayoutArtSeries        Layout = "art_series"         // Art Series collectable double-faced cards
	LayoutReversibleCard   Layout = "reversible_card"    // A Magic card with two sides that are unrelated
)

var AllScryfallLayout = []Layout{
	LayoutNormal,
	LayoutSplit,
	LayoutFlip,
	LayoutTransform,
	LayoutModalDfc,
	LayoutMeld,
	LayoutLeveler,
	LayoutClass,
	LayoutCase,
	LayoutSaga,
	LayoutAdventure,
	LayoutMutate,
	LayoutPrototype,
	LayoutBattle,
	LayoutPlanar,
	LayoutScheme,
	LayoutVanguard,
	LayoutToken,
	LayoutDoubleFacedToken,
	LayoutEmblem,
	LayoutAugment,
	LayoutHost,
	LayoutArtSeries,
	LayoutReversibleCard,
}

func (e Layout) IsValid() bool {
	for _, v := range AllScryfallLayout {
		if e == v {
			return true
		}
	}
	return false
}

func (e Layout) String() string {
	return string(e)
}

func (e *Layout) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = Layout(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ScryfallLayout", str)
	}
	return nil
}

func (e Layout) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
