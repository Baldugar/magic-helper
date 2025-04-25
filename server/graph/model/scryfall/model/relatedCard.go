package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type RelatedCardComponent string

const (
	RelatedCardComponentToken      RelatedCardComponent = "token"
	RelatedCardComponentMeldPart   RelatedCardComponent = "meld_part"
	RelatedCardComponentMeldResult RelatedCardComponent = "meld_result"
	RelatedCardComponentComboPiece RelatedCardComponent = "combo_piece"
)

var AllRelatedCardComponent = []RelatedCardComponent{
	RelatedCardComponentToken,
	RelatedCardComponentMeldPart,
	RelatedCardComponentMeldResult,
	RelatedCardComponentComboPiece,
}

func (e RelatedCardComponent) IsValid() bool {
	switch e {
	case RelatedCardComponentToken, RelatedCardComponentMeldPart, RelatedCardComponentMeldResult, RelatedCardComponentComboPiece:
		return true
	}
	return false
}

func (e RelatedCardComponent) String() string {
	return string(e)
}

func (e *RelatedCardComponent) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = RelatedCardComponent(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid RelatedCardComponent", str)
	}
	return nil
}

func (e RelatedCardComponent) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
