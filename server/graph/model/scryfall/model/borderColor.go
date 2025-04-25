package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type BorderColor string

const (
	BorderColorBorderColorBlack  BorderColor = "black"
	BorderColorBorderColorWhite  BorderColor = "white"
	BorderColorBorderless        BorderColor = "borderless"
	BorderColorBorderColorYellow BorderColor = "yellow"
	BorderColorBorderColorSilver BorderColor = "silver"
	BorderColorBorderColorGold   BorderColor = "gold"
)

var AllBorderColor = []BorderColor{
	BorderColorBorderColorBlack,
	BorderColorBorderColorWhite,
	BorderColorBorderless,
	BorderColorBorderColorYellow,
	BorderColorBorderColorSilver,
	BorderColorBorderColorGold,
}

func (e BorderColor) IsValid() bool {
	for _, v := range AllBorderColor {
		if e == v {
			return true
		}
	}
	return false
}

func (e BorderColor) String() string {
	return string(e)
}

func (e *BorderColor) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = BorderColor(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid BorderColor", str)
	}
	return nil
}

func (e BorderColor) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
