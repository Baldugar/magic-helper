package scryfallModel

import (
	"fmt"
	"io"
	"strconv"
)

type Game string

const (
	GamePaper Game = "paper"
	GameMtgo  Game = "mtgo"
	GameArena Game = "arena"
)

var AllGame = []Game{
	GamePaper,
	GameMtgo,
	GameArena,
}

func (e Game) IsValid() bool {
	for _, v := range AllGame {
		if e == v {
			return true
		}
	}
	return false
}

func (e Game) String() string {
	return string(e)
}

func (e *Game) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = Game(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid Game", str)
	}
	return nil
}

func (e Game) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
