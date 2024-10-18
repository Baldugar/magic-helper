package util

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

func Now() int {
	return int(time.Now().UnixMilli())
}

func UUID4() string {
	return uuid.New().String()
}

// Helper function to split typeLine into types and subtypes
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

// Final cleaning step to remove subtypes that exist in the gathered types
func CleanFinalSubtypes(gatheredTypes map[string]struct{}, subtypes []string) []string {
	var cleanedSubtypes []string
	for _, subtype := range subtypes {
		if _, exists := gatheredTypes[subtype]; !exists {
			cleanedSubtypes = append(cleanedSubtypes, subtype)
		}
	}
	return cleanedSubtypes
}

// Helper function to clean subtypes by removing any that match types or contain "//"
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
