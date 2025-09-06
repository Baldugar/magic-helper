package util

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// Now returns the current time in Unix milliseconds.
func Now() int {
	return int(time.Now().UnixMilli())
}

// UUID4 returns a new RFC 4122 version 4 UUID string.
func UUID4() string {
	return uuid.New().String()
}

// SplitTypeLine splits a type line into types and subtypes.
func SplitTypeLine(typeLine string) (types []string, subtypes []string) {
	// First, split by "//" to remove any separators
	typeLine = strings.Join(strings.Split(typeLine, "//"), " ")

	// Split by " — " to separate types from subtypes
	parts := strings.Split(typeLine, " — ")

	// Split the card types (first part) by spaces
	if len(parts) > 0 {
		types = strings.Split(parts[0], " ")
	}

	// Split the subtypes (if available) by spaces
	if len(parts) > 1 {
		subtypes = strings.Split(parts[1], " ")
	}

	return types, subtypes
}

// CleanFinalSubtypes removes subtypes that collide with gathered type names.
func CleanFinalSubtypes(gatheredTypes map[string]struct{}, subtypes []string) []string {
	var cleanedSubtypes []string
	for _, subtype := range subtypes {
		if _, exists := gatheredTypes[subtype]; !exists {
			cleanedSubtypes = append(cleanedSubtypes, subtype)
		}
	}
	return cleanedSubtypes
}

// CleanSubtypes removes subtypes that are also types or separators like "//".
func CleanSubtypes(types []string, subtypes []string) []string {
	// Create a map to quickly check for types
	typeSet := make(map[string]struct{})
	for _, t := range types {
		typeSet[t] = struct{}{}
	}

	var cleanedSubtypes []string
	for _, subtype := range subtypes {
		// Skip any subtype that is "//" or is also a type
		if subtype == "//" {
			continue
		}
		if _, exists := typeSet[subtype]; exists {
			continue
		}
		cleanedSubtypes = append(cleanedSubtypes, subtype)
	}

	return cleanedSubtypes
}
