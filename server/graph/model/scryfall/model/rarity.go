package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

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
	for _, v := range AllRarity {
		if e == v {
			return true
		}
	}
	return false
}

func (e Rarity) String() string {
	return string(e)
}

func (e *Rarity) UnmarshalGQL(v any) error {
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
