package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type CardObject string

const (
	CardObjectCard CardObject = "card"
)

var AllCardObject = []CardObject{
	CardObjectCard,
}

func (e CardObject) IsValid() bool {
	for _, v := range AllCardObject {
		if e == v {
			return true
		}
	}
	return false
}

func (e CardObject) String() string {
	return string(e)
}

func (e *CardObject) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = CardObject(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid CardObject", str)
	}
	return nil
}

func (e CardObject) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type RelatedCardObject string

const (
	RelatedCardObjectRelatedCard RelatedCardObject = "related_card"
)

var AllRelatedCardObject = []RelatedCardObject{
	RelatedCardObjectRelatedCard,
}

func (e RelatedCardObject) IsValid() bool {
	for _, v := range AllRelatedCardObject {
		if e == v {
			return true
		}
	}
	return false
}

func (e RelatedCardObject) String() string {
	return string(e)
}

func (e *RelatedCardObject) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = RelatedCardObject(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid RelatedCardObject", str)
	}
	return nil
}

func (e RelatedCardObject) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type CardFaceObject string

const (
	CardFaceObjectCardFace CardFaceObject = "card_face"
)

var AllCardFaceObject = []CardFaceObject{
	CardFaceObjectCardFace,
}

func (e CardFaceObject) IsValid() bool {
	for _, v := range AllCardFaceObject {
		if e == v {
			return true
		}
	}
	return false
}

func (e CardFaceObject) String() string {
	return string(e)
}

func (e *CardFaceObject) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = CardFaceObject(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid CardFaceObject", str)
	}
	return nil
}

func (e CardFaceObject) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type SetObject string

const (
	SetObjectSet SetObject = "set"
)

var AllSetObject = []SetObject{
	SetObjectSet,
}

func (e SetObject) IsValid() bool {
	for _, v := range AllSetObject {
		if e == v {
			return true
		}
	}
	return false
}

func (e SetObject) String() string {
	return string(e)
}

func (e *SetObject) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = SetObject(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SetObject", str)
	}
	return nil
}

func (e SetObject) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
