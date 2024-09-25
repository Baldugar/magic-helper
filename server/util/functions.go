package util

import (
	"time"

	"github.com/google/uuid"
)

func Now() int {
	return int(time.Now().UnixMilli())
}

func UUID4() string {
	return uuid.New().String()
}
