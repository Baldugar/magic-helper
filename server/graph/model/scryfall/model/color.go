package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type Color string

const (
	ColorWhite Color = "W"
	ColorBlue  Color = "U"
	ColorBlack Color = "B"
	ColorRed   Color = "R"
	ColorGreen Color = "G"
)

var AllColor = []Color{
	ColorWhite,
	ColorBlue,
	ColorBlack,
	ColorRed,
	ColorGreen,
}

func (e Color) IsValid() bool {
	for _, v := range AllColor {
		if e == v {
			return true
		}
	}
	return false
}

func (e Color) String() string {
	return string(e)
}

func (e *Color) UnmarshalGQL(v any) error {
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
