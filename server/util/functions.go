package util

import (
	"time"

	"github.com/google/uuid"
)

func CreateTimestamp() int {
	return int(time.Now().UnixNano() / 1000000)
}

func UUID4() string {
	return uuid.New().String()
}
