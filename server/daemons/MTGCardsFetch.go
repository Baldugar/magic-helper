package daemons

import (
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/graph/model/scryfall"
	scryfallModel "magic-helper/graph/model/scryfall/model"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type ScryfallResponse struct {
	Data     []json.RawMessage `json:"data"`
	HasMore  bool              `json:"has_more"`
	NextPage string            `json:"next_page"`
}

// ProgressReader wraps an io.Reader, tracks read bytes, and logs progress.
type ProgressReader struct {
	Reader      io.Reader
	TotalSize   int64
	ReadSoFar   int64
	LogInterval int64 // Log every N bytes
	NextLogAt   int64
}

// Read implements the io.Reader interface for ProgressReader.
func (pr *ProgressReader) Read(p []byte) (n int, err error) {
	n, err = pr.Reader.Read(p)
	pr.ReadSoFar += int64(n)

	// Check if it's time to log progress
	if pr.ReadSoFar >= pr.NextLogAt {
		if pr.TotalSize > 0 {
			percentage := float64(pr.ReadSoFar) * 100 / float64(pr.TotalSize)
			// Ensure percentage doesn't exceed 100 in case of read errors/extra data
			if percentage > 100 {
				percentage = 100
			}
			log.Info().Msgf("Download progress: %.2f%% (%d / %d bytes)", percentage, pr.ReadSoFar, pr.TotalSize)
		} else {
			// Log progress by MB if total size is unknown
			log.Info().Msgf("Download progress: %d MB read", pr.ReadSoFar/(1024*1024))
		}
		// Set next logging threshold
		pr.NextLogAt += pr.LogInterval
	}

	// If the read finished exactly at or after the threshold, make sure the next log point is ahead
	if pr.ReadSoFar >= pr.NextLogAt {
		pr.NextLogAt = pr.ReadSoFar + pr.LogInterval
	}

	// If we reached the end and know the total size, log 100% if not already logged
	if err == io.EOF && pr.TotalSize > 0 && pr.ReadSoFar < pr.TotalSize {
		// This case might happen if the last read finished before the final log interval
		// Log final progress if it wasn't logged precisely at 100% due to intervals
		log.Info().Msgf("Download progress: 100.00%% (%d / %d bytes)", pr.TotalSize, pr.TotalSize)
	} else if err == io.EOF && pr.TotalSize > 0 && pr.ReadSoFar >= pr.NextLogAt-pr.LogInterval {
		// Ensure 100% is logged if the last chunk ended near the total size
		log.Info().Msgf("Download progress: 100.00%% (%d / %d bytes)", pr.TotalSize, pr.TotalSize)
	}

	return n, err
}

// NewProgressReader creates a new ProgressReader.
func NewProgressReader(reader io.Reader, totalSize int64) *ProgressReader {
	logIntervalBytes := int64(10 * 1024 * 1024) // Log every 10 MB
	return &ProgressReader{
		Reader:      reader,
		TotalSize:   totalSize,
		ReadSoFar:   0,
		LogInterval: logIntervalBytes,
		NextLogAt:   logIntervalBytes, // Start logging after the first interval
	}
}

func PeriodicFetchMTGCards() {
	log.Info().Msg("Starting periodic fetch cards daemon")
	ctx := context.Background() // Create context once for the loop iteration
	for {
		// fetched :=
		fetchMTGCards(ctx) // Pass context
		// if fetched {
		// }
		collectCards(ctx)

		time.Sleep(24 * time.Hour)
	}

}

func fetchMTGCards(ctx context.Context) bool {
	log.Info().Msg("Fetching cards from Scryfall bulk data endpoint")
	bulkDataUrl := "https://api.scryfall.com/bulk-data"

	// Check if we should fetch cards
	shouldFetch, err := shouldDownloadStart("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch cards")
		return false
	}

	if !shouldFetch {
		return false
	}

	// Fetch the bulk data list
	respList, err := fetchURLWithContext(ctx, bulkDataUrl) // Renamed resp to respList for clarity
	if err != nil {
		log.Error().Err(err).Msg("Error fetching bulk data list")
		return false
	}
	defer respList.Body.Close() // Close list response

	bodyList, err := io.ReadAll(respList.Body) // Read list body
	if err != nil {
		log.Error().Err(err).Msgf("Error reading bulk data list response body")
		return false
	}

	// Unmarshal the bulk data list JSON
	var bulkDataResponse ScryfallResponse // Renamed response to bulkDataResponse
	err = json.Unmarshal(bodyList, &bulkDataResponse)
	if err != nil {
		log.Error().Err(err).Msgf("Error unmarshalling bulk data list response body")
		return false
	}

	rawCollections := bulkDataResponse.Data
	for _, collection := range rawCollections {
		var collectionMap map[string]any
		err := json.Unmarshal(collection, &collectionMap)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling collection item")
			// Maybe continue to next item instead of returning false? For now, return.
			return false
		}

		if collectionType, ok := collectionMap["type"].(string); ok && collectionType == "default_cards" {
			downloadURI, uriOk := collectionMap["download_uri"].(string)
			if !uriOk {
				log.Error().Msgf("Could not get download_uri string from collection item")
				continue // Skip this item if URI is not valid
			}

			log.Info().Msgf("Found 'default_cards' data. Fetching from: %s", downloadURI)

			// Fetch the actual card data file
			respData, err := fetchURLWithContext(ctx, downloadURI) // Use a new response variable: respData
			if err != nil {
				log.Error().Err(err).Msgf("Error fetching card data file from %s", downloadURI)
				// Consider if we should try other bulk data items or return false
				return false
			}
			// IMPORTANT: Defer close inside the loop for *this* response body
			defer respData.Body.Close()

			// Get total size for progress reporting
			contentLengthStr := respData.Header.Get("Content-Length")
			totalSize, _ := strconv.ParseInt(contentLengthStr, 10, 64) // Ignore error, will default to 0 if invalid/missing

			if totalSize > 0 {
				log.Info().Msgf("Starting download of card data file (%d bytes)...", totalSize)
			} else {
				log.Info().Msg("Starting download of card data file (size unknown)...")
			}

			// Wrap the response body with ProgressReader
			progressReader := NewProgressReader(respData.Body, totalSize)

			// Decode the JSON array incrementally using the progress reader
			log.Info().Msgf("Processing cards from %v", downloadURI)
			decoder := json.NewDecoder(progressReader) // Use progressReader here

			// Read the opening bracket `[`
			_, err = decoder.Token()
			if err != nil {
				// Check if the error occurred because the download failed early
				if err == io.EOF && progressReader.ReadSoFar == 0 {
					log.Error().Msg("Download stream empty or failed immediately.")
				} else {
					log.Error().Err(err).Msg("Error decoding card data: expecting start of array `[`")
				}
				return false
			}

			batchSize := 1000 // Process 1000 cards at a time
			var processedCount int = 0

			for decoder.More() {
				var batchRaw []json.RawMessage
				var currentBatchCount int = 0
				// Inner loop to accumulate a batch
				for currentBatchCount < batchSize && decoder.More() {
					var cardRaw json.RawMessage
					if err := decoder.Decode(&cardRaw); err != nil {
						// EOF is expected at the end of the stream inside the loop.
						// Other errors during decode are problematic.
						if err == io.EOF {
							break // Reached end of JSON array
						}
						log.Error().Err(err).Msgf("Error decoding card JSON object at ~card %d", processedCount+currentBatchCount)
						// Decide whether to continue or return false based on error tolerance
						return false // For now, fail on decode errors
					}
					batchRaw = append(batchRaw, cardRaw)
					currentBatchCount++
				} // End of inner batch accumulation loop

				// Process the accumulated batch if it's not empty
				if len(batchRaw) > 0 {
					parsedArr, parseErr := parseCardsFromRaw(batchRaw) // Renamed err variable
					if parseErr != nil {
						log.Error().Err(parseErr).Msgf("Error parsing raw cards batch starting at card %d", processedCount)
						return false
					}

					upsertErr := upsertOriginalCards(ctx, parsedArr, arango.MTG_ORIGINAL_CARDS_COLLECTION) // Renamed err variable
					if upsertErr != nil {
						log.Error().Err(upsertErr).Msgf("Error upserting card batch starting at card %d", processedCount)
						return false
					}
					processedCount += len(batchRaw)
					// Log processing progress, download progress is handled by ProgressReader
					log.Info().Msgf("Processed %d cards...", processedCount)
				}
			} // End of outer decoder loop (decoder.More)

			// Optional: Read closing bracket `]` - decoder.More() handles EOF, so usually not needed
			// _, err = decoder.Token()
			// if err != nil && err != io.EOF { ... }

			log.Info().Msgf("Finished processing approximately %d cards from %s.", processedCount, downloadURI)

			// Only process the first "default_cards" entry found? If yes, we can break here.
			// If multiple "default_cards" entries exist (unlikely but possible), this would only process the first.
			// Let's assume only one is relevant and break after successfully processing it.
			break
		}
	} // End of loop through bulk data items

	// Update the last time we fetched cards (only if successful?)
	// Move this inside the loop before the 'break' if we only process one file?
	// Or keep it here to update even if no 'default_cards' was found (perhaps debatable)
	err = updateLastTimeFetched("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		// Don't return false here, as the main fetch might have succeeded
	}

	log.Info().Msgf("Card fetching process completed.")

	return true
}

func collectCards(ctx context.Context) {
	log.Info().Msg("Collecting cards")

	aql := arango.NewQuery( /* aql */ `
	FOR c IN MTG_Original_Cards
		FILTER c.lang == "en" // TODO: Remove this later
		FILTER c.set_type NOT IN ["promo", "funny", "memorabilia", "vanguard", "token"]
		FILTER "paper" IN c.games OR "mtgo" IN c.games OR "arena" IN c.games
  		FILTER "legal" IN FLATTEN(VALUES(c.legalities)) // TODO: Remove this later
		FILTER c.oversized == false

		// First, handle the "A-" prefix
		LET nameWithoutPrefix = STARTS_WITH(c.name, "A-") ? SUBSTRING(c.name, 2) : c.name
		
		// Next, handle the "Name // Name" pattern
		LET parts = SPLIT(nameWithoutPrefix, " // ")
		LET groupName = LENGTH(parts) == 2 ? parts[0] : nameWithoutPrefix
		
		SORT DATE_TIMESTAMP(c.released_at) ASC // First show non-reprints, then reprints
		// Collect based on the derived groupName, unset metadata
		COLLECT key = groupName INTO cardDocs = UNSET(c, "_key", "_id", "_rev") 
		// LIMIT 1000
		RETURN {
			key: key,
			// Rename the field to avoid confusion with the Go variable name
			cardDocuments: cardDocs 
		}
	`)

	cursor, err := arango.DB.Query(ctx, aql.Query, aql.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error querying database")
		return
	}

	allGroups := make(map[string][]scryfall.Card) // Initialize the map
	defer cursor.Close()
	for cursor.HasMore() {
		// Use a struct that matches the RETURN structure of the AQL query
		var groupResult struct {
			Key           string        `json:"key"`
			CardDocuments []interface{} `json:"cardDocuments"` // Read as []interface{} first
		}

		_, err := cursor.ReadDocument(ctx, &groupResult)
		if err != nil {
			log.Error().Err(err).Msg("Error reading document")
			// Consider continuing or returning based on error handling strategy
			continue
		}

		groupKey := groupResult.Key
		cardsSlice := make([]scryfall.Card, 0, len(groupResult.CardDocuments)) // Pre-allocate slice

		// Iterate through the []interface{} and convert each item
		for i, cardInterface := range groupResult.CardDocuments {
			// 1. Assert the interface{} element is a map[string]interface{}
			cardMap, ok := cardInterface.(map[string]interface{})
			if !ok {
				log.Warn().Msgf("Item %d in group '%s' is not a map[string]interface{}, skipping", i, groupKey)
				continue
			}

			// 2. Convert map[string]interface{} to scryfall.Card
			jsonData, jsonErr := json.Marshal(cardMap)
			if jsonErr != nil {
				log.Error().Err(jsonErr).Msgf("Error marshaling card map %d in group '%s' back to JSON", i, groupKey)
				continue
			}

			var card scryfall.Card
			unmarshalErr := json.Unmarshal(jsonData, &card)
			if unmarshalErr != nil {
				log.Error().Err(unmarshalErr).Msgf("Error unmarshaling JSON back to scryfall.Card for item %d in group '%s'", i, groupKey)
				continue
			}

			cardsSlice = append(cardsSlice, card)
		}

		if len(cardsSlice) > 0 {
			allGroups[groupKey] = cardsSlice
		} else {
			log.Warn().Msgf("Group '%s' resulted in an empty card slice after processing", groupKey)
		}
	} // End HasMore loop

	log.Info().Msgf("Collected %d valid groups", len(allGroups)) // Changed log message slightly

	// Create the necessary directories if they don't exist
	cardsDir := "cards"

	// Create cards directory
	if _, err := os.Stat(cardsDir); os.IsNotExist(err) {
		err = os.MkdirAll(cardsDir, 0755)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating directory %s", cardsDir)
			// Decide if we should continue without saving JSON or return
			return // Return for now if we can't create the dir
		}
	}

	allCardsToSave := make([]model.MtgCard, 0)

	log.Info().Msgf("Processing %d groups", len(allGroups))

	// Save each group into a file named after the group name and download images
	for key, groupData := range allGroups { // Renamed variables for clarity
		log.Info().Msgf("Processing group %s", key)
		groupName := key
		groupCards := groupData

		// Filter card printings within the group (e.g., prefer combined foil/nonfoil entry)
		filteredGroupCards := filterGroupCards(groupCards)

		// Skip group if filtering removed all cards (shouldn't normally happen)
		if len(filteredGroupCards) == 0 {
			log.Warn().Str("groupName", groupName).Msg("Skipping group as filtering removed all cards.")
			continue
		}

		cardForGroup := model.MtgCard{
			ID:             filteredGroupCards[0].ID,
			Layout:         model.MtgLayout(filteredGroupCards[0].Layout),
			Cmc:            filteredGroupCards[0].CMC,
			ColorIdentity:  convertStringSliceToMtgColorSlice(filteredGroupCards[0].ColorIdentity),
			ColorIndicator: convertStringPtrSliceToStringSlice(filteredGroupCards[0].ColorIndicator),
			Colors:         convertStringPtrSliceToMtgColorSlice(filteredGroupCards[0].Colors),
			EDHRecRank:     filteredGroupCards[0].EDHRecRank,
			Keywords:       filteredGroupCards[0].Keywords,
			Loyalty:        filteredGroupCards[0].Loyalty,
			ManaCost:       filteredGroupCards[0].ManaCost,
			Name:           filteredGroupCards[0].Name,
			OracleText:     filteredGroupCards[0].OracleText,
			Power:          filteredGroupCards[0].Power,
			ProducedMana:   convertStringPtrSliceToMtgColorSlice(filteredGroupCards[0].ProducedMana),
			Toughness:      filteredGroupCards[0].Toughness,
			TypeLine:       filteredGroupCards[0].TypeLine,
		}

		for _, card := range filteredGroupCards {
			// Create the DB version structure first (as done previously)
			cardVersionDB := scryfall.MTG_CardVersionDB{
				ID:         card.ID,
				IsDefault:  false, // Will be set later by the default logic
				IsAlchemy:  strings.HasPrefix(card.Name, "A-"),
				Artist:     card.Artist,
				Lang:       scryfallModel.CardLanguage(card.Lang), // Direct cast for enum
				FlavorName: card.FlavorName,
				FlavorText: card.FlavorText,
				// ImageUris will be converted below
				Legalities:  card.Legalities,
				Games:       card.Games,                        // Direct assignment, conversion done below
				Rarity:      scryfallModel.Rarity(card.Rarity), // Direct cast for enum
				ReleasedAt:  card.ReleasedAt,
				Reprint:     card.Reprint,
				SetName:     card.SetName,
				SetType:     card.SetType,
				Set:         card.Set,
				SetID:       card.SetID,
				Variation:   card.Variation,
				VariationOf: card.VariationOf,
			}

			var cardFacesDB []scryfall.MTG_CardVersionFaceDB
			if card.CardFaces != nil {
				for _, face := range *card.CardFaces {
					cardFacesDB = append(cardFacesDB, scryfall.MTG_CardVersionFaceDB{
						Artist:         face.Artist,
						CMC:            face.CMC,
						ColorIndicator: face.ColorIndicator,
						Colors:         face.Colors,
						FlavorText:     face.FlavorText,
						ImageUris:      face.ImageUris, // Will be converted below
						Loyalty:        face.Loyalty,
						ManaCost:       face.ManaCost,
						Name:           face.Name,
						OracleText:     face.OracleText,
						Power:          face.Power,
						Toughness:      face.Toughness,
						TypeLine:       face.TypeLine,
						Layout:         face.Layout, // Will be converted below
					})
				}
			}
			if len(cardFacesDB) > 0 {
				cardVersionDB.CardFaces = &cardFacesDB
			}
			// Assign ImageUris after potential faces processing (though source struct is flat here)
			cardVersionDB.ImageUris = card.ImageUris // Assign the scryfall type

			// Now convert scryfall.MTG_CardVersionDB to model.MtgCardVersion
			lang := cardVersionDB.Lang.String()
			rarity := model.MtgRarity(cardVersionDB.Rarity)

			cardVersionModel := &model.MtgCardVersion{
				ID:          cardVersionDB.ID,
				IsDefault:   cardVersionDB.IsDefault, // Default logic will overwrite this later
				IsAlchemy:   cardVersionDB.IsAlchemy,
				Artist:      cardVersionDB.Artist,
				Lang:        lang,
				FlavorName:  cardVersionDB.FlavorName,
				FlavorText:  cardVersionDB.FlavorText,
				CardFaces:   convertCardFaces(cardVersionDB.CardFaces),      // Use helper
				Legalities:  convertLegalitiesMap(cardVersionDB.Legalities), // Use helper
				Games:       convertGamesSlice(cardVersionDB.Games),         // Use helper
				ImageUris:   convertImageUris(cardVersionDB.ImageUris),      // Use helper
				Rarity:      rarity,
				ReleasedAt:  cardVersionDB.ReleasedAt,
				Reprint:     cardVersionDB.Reprint,
				SetName:     cardVersionDB.SetName,
				SetType:     cardVersionDB.SetType,
				Set:         cardVersionDB.Set,
				SetID:       cardVersionDB.SetID,
				Variation:   cardVersionDB.Variation,
				VariationOf: cardVersionDB.VariationOf,
			}

			cardForGroup.Versions = append(cardForGroup.Versions, cardVersionModel)
		}

		log.Info().Msg("Determining default version...")

		// Filter out duplicate versions based on specific fields
		uniqueVersions := make([]*model.MtgCardVersion, 0)
		seen := make(map[string]bool)

		for _, v := range cardForGroup.Versions {
			artist := ""
			if v.Artist != nil {
				artist = *v.Artist
			}
			flavorText := ""
			if v.FlavorText != nil {
				flavorText = *v.FlavorText
			}
			games := make([]string, len(v.Games))
			for i, game := range v.Games {
				games[i] = string(game)
			}
			sort.Strings(games) // Sort games to ensure order independence
			key := artist + v.Lang + flavorText + strings.Join(games, ",") + string(v.Rarity) + v.ReleasedAt + v.Set
			if !seen[key] {
				seen[key] = true
				uniqueVersions = append(uniqueVersions, v)
			}
		}

		cardForGroup.Versions = uniqueVersions

		// --- Start: Logic to determine the single default version ---
		if len(cardForGroup.Versions) > 0 {
			bestDefaultIndex := -1
			var earliestDate time.Time
			maxGames := -1
			bestIsNonAlchemy := false // Track if the current best is non-alchemy

			// Iterate through all versions to find the best default candidate
			for i, v := range cardForGroup.Versions {
				// Initial candidates are those marked as non-reprints
				// We will refine this based on other criteria
				isCandidate := !v.Reprint // Access field directly on pointer

				if !isCandidate {
					continue // Skip reprints initially
				}

				isCurrentNonAlchemy := !v.IsAlchemy                        // Access field directly on pointer
				numGames := len(v.Games)                                   // Access field directly on pointer
				releaseDate, err := time.Parse("2006-01-02", v.ReleasedAt) // Access field directly on pointer
				if err != nil {
					log.Warn().Err(err).Str("card_id", v.ID).Str("release_date", v.ReleasedAt).Msg("Could not parse release date for default version comparison, skipping version.")
					continue // Skip this version if date is unparseable
				}

				// Determine if the current version `v` is better than the current best
				isBetter := false
				if bestDefaultIndex == -1 {
					// First valid candidate found
					isBetter = true
				} else {
					// Rule: Prefer non-Alchemy
					if isCurrentNonAlchemy && !bestIsNonAlchemy {
						isBetter = true // New one is non-Alchemy, old one was Alchemy
					} else if !isCurrentNonAlchemy && bestIsNonAlchemy {
						isBetter = false // New one is Alchemy, old one was non-Alchemy - stick with non-Alchemy
					} else {
						// Both are Alchemy or both are non-Alchemy, compare games
						if numGames > maxGames {
							isBetter = true
						} else if numGames == maxGames {
							// Rule: Tie-break games with earlier release date
							if releaseDate.Before(earliestDate) {
								isBetter = true
							}
						}
						// If numGames < maxGames, isBetter remains false
					}
				}

				// Update the best candidate if the current one is better
				if isBetter {
					bestDefaultIndex = i
					earliestDate = releaseDate
					maxGames = numGames
					bestIsNonAlchemy = isCurrentNonAlchemy
				}
			} // End loop finding best candidate

			// Rule: If no non-reprint version was found, pick the first version overall
			if bestDefaultIndex == -1 && len(cardForGroup.Versions) > 0 {
				bestDefaultIndex = 0
				log.Warn().Str("card_name", cardForGroup.Name).Msg("No non-reprint version found, defaulting to the first version.")
			}

			// Set IsDefault flag based on the determined best index
			if bestDefaultIndex != -1 {
				for j := range cardForGroup.Versions {
					cardForGroup.Versions[j].IsDefault = (j == bestDefaultIndex)
				}
			} else {
				// This case should theoretically not happen if len(versions)>0, but as a fallback:
				log.Fatal().Str("card_name", cardForGroup.Name).Msg("Could not determine a default version.")
				// Perhaps leave all IsDefault as false or handle error appropriately
			}
		}
		// --- End: Logic to determine the single default version ---

		allCardsToSave = append(allCardsToSave, cardForGroup)

		// // Step 1: Save the filtered group data to a JSON file
		// _, saveErr := saveGroupToFile(groupName, filteredGroupCards, cardsDir)
		// if saveErr != nil {
		// 	// Log message already printed inside saveGroupToFile
		// 	continue // Skip to the next group if saving fails
		// }

		// // Step 2: Download images for the cards in this filtered group
		// downloadImagesForGroup(filteredGroupCards, cardsDir)

	} // End group processing loop

	aq := arango.NewQuery( /* aql */ `
		FOR c IN @cards
			UPSERT { _key: c._key }
			INSERT MERGE({ _key: c._key }, c)
			UPDATE c
			IN @@collection
		`)

	aq.AddBindVar("cards", allCardsToSave)
	aq.AddBindVar("@collection", arango.MTG_CARDS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error upserting cards")
	}

	log.Info().Msgf("Finished processing %d groups. JSON saved to '%s' directory.", len(allGroups), cardsDir)
}

// Helper function to convert []string to []model.MtgColor
func convertStringSliceToMtgColorSlice(input []string) []model.MtgColor {
	if input == nil {
		return nil
	}
	output := make([]model.MtgColor, len(input))
	for i, s := range input {
		output[i] = model.MtgColor(s)
	}
	return output
}

// Helper function to convert *[]string to []model.MtgColor
func convertStringPtrSliceToMtgColorSlice(input *[]string) []model.MtgColor {
	if input == nil {
		return nil
	}
	return convertStringSliceToMtgColorSlice(*input)
}

// Helper function to convert *[]string to []string
func convertStringPtrSliceToStringSlice(input *[]string) []string {
	if input == nil {
		return nil
	}
	// Create a new slice and copy elements
	output := make([]string, len(*input))
	copy(output, *input)
	return output
}

// Helper function to convert scryfall game slice to model game slice
func convertGamesSlice(input []scryfallModel.Game) []model.MtgGame {
	if input == nil {
		return nil
	}
	output := make([]model.MtgGame, len(input))
	for i, g := range input {
		output[i] = model.MtgGame(g)
	}
	return output
}

// Helper function to convert scryfall image uris to model image uris
func convertImageUris(input *scryfall.ImageUris) *model.MtgImage {
	if input == nil {
		return nil
	}
	return &model.MtgImage{
		Small:      input.Small,
		Normal:     input.Normal,
		Large:      input.Large,
		Png:        input.PNG,
		ArtCrop:    input.ArtCrop,
		BorderCrop: input.BorderCrop,
	}
}

// Helper function to convert scryfall card faces to model card faces
func convertCardFaces(input *[]scryfall.MTG_CardVersionFaceDB) []*model.MtgCardFace {
	if input == nil {
		return nil
	}
	output := make([]*model.MtgCardFace, len(*input))
	for i, faceDB := range *input {
		var faceLayout *model.MtgLayout
		if faceDB.Layout != nil {
			l := model.MtgLayout(*faceDB.Layout)
			faceLayout = &l
		}
		output[i] = &model.MtgCardFace{
			Artist:         faceDB.Artist,
			Cmc:            faceDB.CMC,
			ColorIndicator: convertStringPtrSliceToStringSlice(faceDB.ColorIndicator), // string slice
			Colors:         convertStringPtrSliceToMtgColorSlice(faceDB.Colors),       // MtgColor slice
			FlavorText:     faceDB.FlavorText,
			ImageUris:      convertImageUris(faceDB.ImageUris),
			Layout:         faceLayout,
			Loyalty:        faceDB.Loyalty,
			ManaCost:       faceDB.ManaCost,
			Name:           faceDB.Name,
			OracleText:     faceDB.OracleText,
			Power:          faceDB.Power,
			Toughness:      faceDB.Toughness,
			TypeLine:       faceDB.TypeLine,
		}
	}
	return output
}

// Helper function to convert map[string]string to map[string]any
func convertLegalitiesMap(input map[string]string) map[string]any {
	if input == nil {
		return nil
	}
	output := make(map[string]any, len(input))
	for k, v := range input {
		output[k] = v // Direct assignment is fine as string is compatible with any
	}
	return output
}
