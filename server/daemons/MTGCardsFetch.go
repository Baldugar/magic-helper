package daemons

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/graph/model/scryfall"
	scryfallModel "magic-helper/graph/model/scryfall/model"
	"magic-helper/graph/mtg"
	"magic-helper/util/mtgCardSearch"
	"math"
	"os"
	"path/filepath"
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
		fetched := fetchMTGCards(ctx) // Pass context
		if fetched {
			collectCards(ctx)
		} else {
			// Build card index for faster filtering even if no new cards were fetched
			buildCardIndex(ctx)
		}

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

			// Fetch and process card data
			err = fetchAndProcessCardData(ctx, downloadURI)
			if err != nil {
				log.Error().Err(err).Msgf("Error processing card data from %s", downloadURI)
				return false
			}

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

// Fetch and process card data
func fetchAndProcessCardData(ctx context.Context, downloadURI string) error {
	// Fetch the actual card data file
	respData, err := fetchURLWithContext(ctx, downloadURI)
	if err != nil {
		log.Error().Err(err).Msgf("Error fetching card data file from %s", downloadURI)
		return err
	}
	defer respData.Body.Close()

	// Read the response body into a buffer
	bodyBytes, err := io.ReadAll(respData.Body)
	if err != nil {
		log.Error().Err(err).Msg("Error reading response body")
		return err
	}

	// Optionally download the file to a local file
	err = downloadFile(bytes.NewReader(bodyBytes), "cards.json")
	if err != nil {
		log.Error().Err(err).Msgf("Error downloading card data file from %s", downloadURI)
		return err
	}

	// Get total size for progress reporting
	contentLengthStr := respData.Header.Get("Content-Length")
	totalSize, _ := strconv.ParseInt(contentLengthStr, 10, 64) // Ignore error, will default to 0 if invalid/missing

	if totalSize > 0 {
		log.Info().Msgf("Starting download of card data file (%d bytes)...", totalSize)
	} else {
		log.Info().Msg("Starting download of card data file (size unknown)...")
	}

	// Wrap the response body with ProgressReader
	progressReader := NewProgressReader(bytes.NewReader(bodyBytes), totalSize)

	// Decode the JSON array incrementally using the progress reader
	log.Info().Msgf("Processing cards from %v", downloadURI)
	decoder := json.NewDecoder(progressReader) // Use progressReader here

	// Read the opening bracket `[` and process the data
	_, err = decoder.Token()
	if err != nil {
		// Check if the error occurred because the download failed early
		if err == io.EOF && progressReader.ReadSoFar == 0 {
			log.Error().Msg("Download stream empty or failed immediately.")
		} else {
			log.Error().Err(err).Msg("Error decoding card data: expecting start of array `[`")
		}
		return err
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
				return err // For now, fail on decode errors
			}
			batchRaw = append(batchRaw, cardRaw)
			currentBatchCount++
		} // End of inner batch accumulation loop

		// Process the accumulated batch if it's not empty
		if len(batchRaw) > 0 {
			parsedArr, parseErr := parseCardsFromRaw(batchRaw) // Renamed err variable
			if parseErr != nil {
				log.Error().Err(parseErr).Msgf("Error parsing raw cards batch starting at card %d", processedCount)
				return parseErr
			}

			upsertErr := upsertOriginalCards(ctx, parsedArr, arango.MTG_ORIGINAL_CARDS_COLLECTION) // Renamed err variable
			if upsertErr != nil {
				log.Error().Err(upsertErr).Msgf("Error upserting card batch starting at card %d", processedCount)
				return upsertErr
			}
			processedCount += len(batchRaw)
			// Log processing progress, download progress is handled by ProgressReader
			log.Info().Msgf("Processed %d cards...", processedCount)
		}
	} // End of outer decoder loop (decoder.More)

	log.Info().Msgf("Finished processing approximately %d cards from %s.", processedCount, downloadURI)

	return nil
}

func collectCards(ctx context.Context) {
	log.Info().Msg("Collecting cards")

	// Clear the collection
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @@collection
			REMOVE c IN @@collection
	`)
	aq.AddBindVar("@collection", arango.MTG_CARDS_COLLECTION)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error clearing collection")
	}

	// Collect the cards
	aq = arango.NewQuery( /* aql */ `
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

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
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

	allCardsToSave := make([]scryfall.MTG_CardDB, 0)

	log.Info().Msgf("Processing %d groups", len(allGroups))

	// Calculate total number of groups
	totalGroups := len(allGroups)
	processedGroups := 0
	progressInterval := 10 // Log every 10%
	logThreshold := progressInterval

	for key, groupData := range allGroups { // Renamed variables for clarity
		groupName := key
		groupCards := groupData

		// Filter card printings within the group (e.g., prefer combined foil/nonfoil entry)
		filteredGroupCards := groupCards

		// Skip group if filtering removed all cards (shouldn't normally happen)
		if len(filteredGroupCards) == 0 {
			log.Warn().Str("groupName", groupName).Msg("Skipping group as filtering removed all cards.")
			continue
		}

		cardForGroup := scryfall.MTG_CardDB{
			Layout:         scryfallModel.Layout(filteredGroupCards[0].Layout),
			CMC:            filteredGroupCards[0].CMC,
			ColorIdentity:  filteredGroupCards[0].ColorIdentity,
			ColorIndicator: filteredGroupCards[0].ColorIndicator,
			Colors:         filteredGroupCards[0].Colors,
			EDHRecRank:     filteredGroupCards[0].EDHRecRank,
			Keywords:       filteredGroupCards[0].Keywords,
			Loyalty:        filteredGroupCards[0].Loyalty,
			ManaCost:       filteredGroupCards[0].ManaCost,
			Name:           filteredGroupCards[0].Name,
			OracleText:     filteredGroupCards[0].OracleText,
			Power:          filteredGroupCards[0].Power,
			ProducedMana:   filteredGroupCards[0].ProducedMana,
			Toughness:      filteredGroupCards[0].Toughness,
			TypeLine:       filteredGroupCards[0].TypeLine,
		}

		if len(cardForGroup.ColorIdentity) == 0 {
			cardForGroup.ColorIdentity = []string{"C"}
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
				Legalities:      card.Legalities,
				Games:           card.Games,
				Name:            card.Name,
				Rarity:          scryfallModel.Rarity(card.Rarity), // Direct cast for enum
				ReleasedAt:      card.ReleasedAt,
				Reprint:         card.Reprint,
				SetName:         card.SetName,
				SetType:         card.SetType,
				Set:             card.Set,
				SetID:           card.SetID,
				Variation:       card.Variation,
				VariationOf:     card.VariationOf,
				Booster:         card.Booster,
				Finishes:        card.Finishes,
				FrameEffects:    card.FrameEffects,
				FullArt:         card.FullArt,
				PromoTypes:      card.PromoTypes,
				CollectorNumber: card.CollectorNumber,
				IllustrationID:  card.IllustrationID,
			}

			var cardFacesDB []scryfall.MTG_CardVersionFaceDB
			if card.CardFaces != nil {
				for _, face := range *card.CardFaces {
					cardFace := scryfall.MTG_CardVersionFaceDB{
						Artist:         face.Artist,
						CMC:            face.CMC,
						ColorIndicator: face.ColorIndicator,
						Colors:         face.Colors,
						FlavorText:     face.FlavorText,
						Loyalty:        face.Loyalty,
						ManaCost:       face.ManaCost,
						Name:           face.Name,
						OracleText:     face.OracleText,
						Power:          face.Power,
						Toughness:      face.Toughness,
						TypeLine:       face.TypeLine,
						Layout:         face.Layout, // Will be converted below
					}

					if face.ImageUris != nil {
						cardFace.ImageUris = &model.MtgImage{
							ArtCrop:    face.ImageUris.ArtCrop,
							BorderCrop: face.ImageUris.BorderCrop,
							Large:      face.ImageUris.Large,
							Normal:     face.ImageUris.Normal,
							Small:      face.ImageUris.Small,
							Png:        face.ImageUris.PNG,
						}
					}
					cardFacesDB = append(cardFacesDB, cardFace)
				}
			}
			if len(cardFacesDB) > 0 {
				cardVersionDB.CardFaces = &cardFacesDB
			}
			// Assign ImageUris after potential faces processing (though source struct is flat here)
			if card.ImageUris != nil {
				cardVersionDB.ImageUris = &model.MtgImage{
					ArtCrop:    card.ImageUris.ArtCrop,
					BorderCrop: card.ImageUris.BorderCrop,
					Large:      card.ImageUris.Large,
					Normal:     card.ImageUris.Normal,
					Small:      card.ImageUris.Small,
					Png:        card.ImageUris.PNG,
				}
			}

			cardForGroup.Versions = append(cardForGroup.Versions, cardVersionDB)
		}

		// --- Start: Logic to determine the single default version ---
		if len(cardForGroup.Versions) > 0 {
			bestIdx := 0
			bestScore := math.MinInt

			for i, v := range cardForGroup.Versions {
				if v.Reprint {
					continue
				} // mantenemos tu filtro
				sc := score(&v)
				if sc > bestScore {
					bestScore, bestIdx = sc, i
				}
			}

			// fallback si todo eran reprints
			if bestScore == math.MinInt {
				bestIdx = 0
			}

			for i := range cardForGroup.Versions {
				cardForGroup.Versions[i].IsDefault = (i == bestIdx)
			}
			defaultVersion := cardForGroup.Versions[bestIdx]
			cardForGroup.ID = normalizeCardName(defaultVersion.Name)
		}
		// --- End: Logic to determine the single default version ---

		// Find versions that are from the same set, for each of them, if they have the same illustration_id, log them in groups in the console
		// Group by set, then by illustration_id
		setIllustrationGroups := make(map[string]map[string][]scryfall.MTG_CardVersionDB)
		for _, v := range cardForGroup.Versions {
			if v.IllustrationID == nil || *v.IllustrationID == "" {
				continue // skip if no illustration_id
			}
			if _, ok := setIllustrationGroups[v.Set]; !ok {
				setIllustrationGroups[v.Set] = make(map[string][]scryfall.MTG_CardVersionDB)
			}
			setIllustrationGroups[v.Set][*v.IllustrationID] = append(setIllustrationGroups[v.Set][*v.IllustrationID], v)
		}

		allCardsToSave = append(allCardsToSave, cardForGroup)

		// Update processed groups count
		processedGroups++
		progress := (processedGroups * 100) / totalGroups
		if progress >= logThreshold {
			log.Info().Msgf("Processing progress: %d%% (%d / %d groups)", progress, processedGroups, totalGroups)
			logThreshold += progressInterval
		}

	} // End group processing loop

	aq = arango.NewQuery( /* aql */ `
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

	// Rebuild the card index after updating cards
	buildCardIndex(ctx)
}

func strSliceContains(sl []string, s string) bool {
	for _, v := range sl {
		if v == s {
			return true
		}
	}
	return false
}
func hasAny(sl []string, targets []string) bool {
	for _, t := range targets {
		if strSliceContains(sl, t) {
			return true
		}
	}
	return false
}
func onlyFoil(v *scryfall.MTG_CardVersionDB) bool {
	return len(v.Finishes) == 1 && v.Finishes[0] == "foil"
}

func score(v *scryfall.MTG_CardVersionDB) int {
	s := 0
	if v.Booster {
		s += 10000
	}
	if !v.IsAlchemy {
		s += 200000
	}
	if strSliceContains(v.Finishes, "nonfoil") {
		s += 1000
	}
	if v.FrameEffects != nil && len(*v.FrameEffects) == 0 && !v.FullArt {
		s += 500
	}
	if v.PromoTypes != nil && !hasAny(*v.PromoTypes, []string{"serialized", "doublerainbow", "boosterfun", "showcase"}) {
		s += 200
	}
	if v.FrameEffects != nil && len(*v.FrameEffects) == 0 && !v.FullArt {
		s += 500
	}
	if onlyFoil(v) {
		s -= 200
	}

	return s
}

// normalizeCardName normalizes a card name to be used as a document key in ArangoDB.
func normalizeCardName(name string) string {
	// Convert to lowercase
	name = strings.ToLower(name)

	// Replace spaces and special characters with underscores
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, ":", "_")

	// Remove slashes
	name = strings.ReplaceAll(name, "/", "")

	// Remove any remaining disallowed characters
	name = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			return r
		}
		return -1
	}, name)

	// Ensure the name does not start with an underscore
	if strings.HasPrefix(name, "_") {
		name = "key" + name
	}

	return name
}

// buildCardIndex builds the card index for faster filtering
func buildCardIndex(ctx context.Context) {
	log.Info().Msg("Building card index...")

	// Get basic cards from database (without ratings and tags for faster indexing)
	cards, err := mtg.GetMTGCardsBasic(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get basic cards for index building")
		return
	}

	// Build the index using the utility function
	err = mtgCardSearch.BuildCardIndexWithCards(cards)
	if err != nil {
		log.Error().Err(err).Msg("Failed to build card index")
		return
	}

	log.Info().Msg("Card index built successfully")
}

// downloadFile saves the response body to a local file under the 'cards' directory.
func downloadFile(body io.Reader, filename string) error {
	// Ensure the 'cards' directory exists
	cardsDir := "cards"
	if _, err := os.Stat(cardsDir); os.IsNotExist(err) {
		err = os.MkdirAll(cardsDir, 0755)
		if err != nil {
			return err
		}
	}

	// Create the file in the 'cards' directory
	filePath := filepath.Join(cardsDir, filename)
	out, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, body)
	if err != nil {
		return err
	}

	return nil
}
