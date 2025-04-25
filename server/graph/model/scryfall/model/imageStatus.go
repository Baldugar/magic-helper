package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type ImageStatus string

const (
	ImageStatusMissing     ImageStatus = "missing"
	ImageStatusLowres      ImageStatus = "lowres"
	ImageStatusHighres     ImageStatus = "highres"
	ImageStatusPlaceholder ImageStatus = "placeholder"
)

var AllImageStatus = []ImageStatus{
	ImageStatusMissing,
	ImageStatusLowres,
	ImageStatusHighres,
	ImageStatusPlaceholder,
}

func (e ImageStatus) IsValid() bool {
	for _, v := range AllImageStatus {
		if e == v {
			return true
		}
	}
	return false
}

func (e ImageStatus) String() string {
	return string(e)
}

func (e *ImageStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = ImageStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ImageStatus", str)
	}
	return nil
}

func (e ImageStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
