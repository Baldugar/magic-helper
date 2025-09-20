package daemons

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// ScryfallResponse represents a paginated response from Scryfall APIs that
// include a data array and optional pagination fields.
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

// PeriodicFetchMTGCards runs a 24h loop to fetch, process, and index MTG cards from Scryfall.
func PeriodicFetchMTGCards() {
	log.Info().Msg("Starting periodic fetch cards daemon")
	ctx := context.Background() // Create context once for the loop iteration
	for {
		fetched := fetchMTGCards(ctx) // Pass context
		if fetched {
			collectCards(ctx)
		} else {
			// Build card index for faster filtering even if no new cards were fetched
			cards, err := mtg.GetMTGCards(ctx)
			if err != nil {
				log.Error().Err(err).Msg("Error fetching cards")
				continue
			}
			err = mtgCardSearch.BuildCardIndexWithCards(cards)
			if err != nil {
				log.Error().Err(err).Msg("Error building card index")
				continue
			}
		}

		time.Sleep(24 * time.Hour)
	}
}

// fetchMTGCards checks whether a new download is needed and, if so, locates
// the "default_cards" bulk dataset and processes it.
func fetchMTGCards(ctx context.Context) bool {
	log.Info().Msg("Fetching cards from Scryfall bulk data endpoint")
	bulkDataUrl := "https://api.scryfall.com/bulk-data"

	report := newImportReportBuilder("MTG_cards")
	defer report.Complete(ctx)
	report.AddMetadata("bulk_list_url", bulkDataUrl)

	// Check if we should fetch cards
	shouldFetch, err := shouldDownloadStart("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch cards")
		report.MarkFailed(err)
		return false
	}

	if !shouldFetch {
		report.MarkSkipped("fetched in the last 24 hours")
		return false
	}

	// Fetch the bulk data list
	respList, err := fetchURLWithContext(ctx, bulkDataUrl) // Renamed resp to respList for clarity
	if err != nil {
		log.Error().Err(err).Msg("Error fetching bulk data list")
		report.MarkFailed(err)
		return false
	}
	defer respList.Body.Close() // Close list response

	bodyList, err := io.ReadAll(respList.Body) // Read list body
	if err != nil {
		log.Error().Err(err).Msgf("Error reading bulk data list response body")
		report.MarkFailed(err)
		return false
	}

	// Unmarshal the bulk data list JSON
	var bulkDataResponse ScryfallResponse // Renamed response to bulkDataResponse
	err = json.Unmarshal(bodyList, &bulkDataResponse)
	if err != nil {
		log.Error().Err(err).Msgf("Error unmarshalling bulk data list response body")
		report.MarkFailed(err)
		return false
	}

	rawCollections := bulkDataResponse.Data
	report.AddMetadata("collections_discovered", len(rawCollections))
	processedCount := 0
	for _, collection := range rawCollections {
		var collectionMap map[string]any
		err := json.Unmarshal(collection, &collectionMap)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling collection item")
			// Maybe continue to next item instead of returning false? For now, return.
			report.MarkFailed(err)
			return false
		}

		if collectionType, ok := collectionMap["type"].(string); ok && collectionType == "default_cards" {
			downloadURI, uriOk := collectionMap["download_uri"].(string)
			if !uriOk {
				log.Error().Msgf("Could not get download_uri string from collection item")
				report.MarkFailed(fmt.Errorf("default_cards entry missing download_uri"))
				continue // Skip this item if URI is not valid
			}

			log.Info().Msgf("Found 'default_cards' data. Fetching from: %s", downloadURI)
			report.AddMetadata("download_uri", downloadURI)

			// Fetch and process card data
			processedCount, err = fetchAndProcessCardData(ctx, downloadURI)
			if err != nil {
				log.Error().Err(err).Msgf("Error processing card data from %s", downloadURI)
				report.MarkFailed(err)
				return false
			}
			report.SetRecordsProcessed(processedCount)

			// Only process the first "default_cards" entry found? If yes, we can break here.
			// If multiple "default_cards" entries exist (unlikely but possible), this would only process the first.
			// Let's assume only one is relevant and break after successfully processing it.
			break
		}
	} // End of loop through bulk data items
	report.SetRecordsProcessed(processedCount)
	report.AddMetadata("default_cards_found", processedCount > 0)

	// Update the last time we fetched cards (only if successful?)
	// Move this inside the loop before the 'break' if we only process one file?
	// Or keep it here to update even if no 'default_cards' was found (perhaps debatable)
	err = updateLastTimeFetched("MTG_cards")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		// Don't return false here, as the main fetch might have succeeded
		report.MarkFailed(err)
	}

	log.Info().Msgf("Card fetching process completed.")

	return true
}

// fetchAndProcessCardData fetches a bulk JSON file of cards and incrementally
// decodes and upserts them into Arango in batches while logging progress.
// It returns the number of card documents processed.
func fetchAndProcessCardData(ctx context.Context, downloadURI string) (int, error) {
	// Fetch the actual card data file
	respData, err := fetchURLWithContext(ctx, downloadURI)
	if err != nil {
		log.Error().Err(err).Msgf("Error fetching card data file from %s", downloadURI)
		return 0, err
	}
	defer respData.Body.Close()

	// Read the response body into a buffer
	bodyBytes, err := io.ReadAll(respData.Body)
	if err != nil {
		log.Error().Err(err).Msg("Error reading response body")
		return 0, err
	}

	// Optionally download the file to a local file
	err = downloadFile(bytes.NewReader(bodyBytes), "cards.json")
	if err != nil {
		log.Error().Err(err).Msgf("Error downloading card data file from %s", downloadURI)
		return 0, err
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
		return 0, err
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
				return processedCount, err // For now, fail on decode errors
			}
			batchRaw = append(batchRaw, cardRaw)
			currentBatchCount++
		} // End of inner batch accumulation loop

		// Process the accumulated batch if it's not empty
		if len(batchRaw) > 0 {
			parsedArr, parseErr := parseCardsFromRaw(batchRaw) // Renamed err variable
			if parseErr != nil {
				log.Error().Err(parseErr).Msgf("Error parsing raw cards batch starting at card %d", processedCount)
				return processedCount, parseErr
			}

			upsertErr := upsertOriginalCards(ctx, parsedArr) // Renamed err variable
			if upsertErr != nil {
				log.Error().Err(upsertErr).Msgf("Error upserting card batch starting at card %d", processedCount)
				return processedCount, upsertErr
			}
			processedCount += len(batchRaw)
			// Log processing progress, download progress is handled by ProgressReader
			log.Info().Msgf("Processed %d cards...", processedCount)
		}
	} // End of outer decoder loop (decoder.More)

	log.Info().Msgf("Finished processing approximately %d cards from %s.", processedCount, downloadURI)

	return processedCount, nil
}

// collectCards rebuilds the curated MTG_Cards collection from MTG_Original_Cards
// by grouping variants and picking a default version per group.
func collectCards(ctx context.Context) {
	log.Info().Msg("Collecting cards")

	// Clear the collection
	aq := arango.NewQuery( /* aql */ `
		FOR c IN MTG_Cards
			REMOVE c IN MTG_Cards
	`)

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

		// --- Start: Logic to determine the single default version (improved) ---
		if len(cardForGroup.Versions) > 0 {
			bestIdx := pickDefaultIndex(cardForGroup.Versions)
			for i := range cardForGroup.Versions {
				cardForGroup.Versions[i].IsDefault = (i == bestIdx)
			}
			defaultVersion := cardForGroup.Versions[bestIdx]
			cardForGroup.ID = normalizeCardName(defaultVersion.Name)
		}
		// --- End: Logic to determine the single default version (improved) ---

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
			IN MTG_Cards
		`)

	aq.AddBindVar("cards", allCardsToSave)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error upserting cards")
	}

	log.Info().Msgf("Finished processing %d groups. JSON saved to '%s' directory.", len(allGroups), cardsDir)

	// Rebuild the card index after updating cards
	cards, err := mtg.GetMTGCards(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Error fetching cards")
		return
	}
	err = mtgCardSearch.BuildCardIndexWithCards(cards)
	if err != nil {
		log.Error().Err(err).Msg("Error building card index")
		return
	}
}

// has returns whether target is present in sl.
func has(sl []string, target string) bool {
	return slices.Contains(sl, target)
}

// hasOpt checks membership in an optional slice pointer.
func hasOpt(sl *[]string, target string) bool {
	if sl == nil {
		return false
	}
	return has(*sl, target)
}

// safeString returns the pointed string or the empty string if nil.
func safeString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// intForCollectorNumber converts a collector number to int or returns MaxInt32 on failure.
func intForCollectorNumber(cn string) int {
	n, err := strconv.Atoi(cn)
	if err != nil {
		return math.MaxInt32
	}
	return n
}

// containsGame checks whether target exists in the list of game platforms.
func containsGame(games []scryfallModel.Game, target string) bool {
	for _, g := range games {
		if string(g) == target {
			return true
		}
	}
	return false
}

// platformCount counts supported platforms among paper/mtgo/arena for a version.
func platformCount(games []scryfallModel.Game) int {
	count := 0
	if containsGame(games, "paper") {
		count++
	}
	if containsGame(games, "mtgo") {
		count++
	}
	if containsGame(games, "arena") {
		count++
	}
	return count
}

type groupStats struct {
	modeIllustrationID string
	topArtists         map[string]struct{}
}

func computeGroupStats(versions []scryfall.MTG_CardVersionDB) groupStats {
	illCount := make(map[string]int)
	artistCount := make(map[string]int)

	for _, v := range versions {
		id := safeString(v.IllustrationID)
		if id != "" {
			illCount[id]++
		}
		artist := safeString(v.Artist)
		if artist != "" {
			artistCount[artist]++
		}
	}

	stats := groupStats{topArtists: make(map[string]struct{})}
	for id, c := range illCount {
		if c > illCount[stats.modeIllustrationID] {
			stats.modeIllustrationID = id
		}
	}

	maxArtist := 0
	for artist, c := range artistCount {
		if c > maxArtist {
			maxArtist = c
			stats.topArtists = map[string]struct{}{artist: {}}
		} else if c == maxArtist {
			stats.topArtists[artist] = struct{}{}
		}
	}

	return stats
}

var promoTypePenalties = []string{"portrait", "ripplefoil", "boosterfun", "showcase", "serial", "halo", "galaxy", "neon", "stainedglass"}

func scoreVersion(v *scryfall.MTG_CardVersionDB, stats groupStats) int {
	s := 0
	if containsGame(v.Games, "paper") {
		s += 6
	}
	if containsGame(v.Games, "mtgo") {
		s += 3
	}
	if containsGame(v.Games, "arena") {
		s += 2
	}

	hasNonfoil := has(v.Finishes, "nonfoil")
	hasFoil := has(v.Finishes, "foil")
	if hasNonfoil {
		s += 6
	}
	if hasFoil {
		s += 1
	}
	if hasNonfoil && hasFoil {
		s += 2
	}
	if hasFoil && !hasNonfoil {
		s -= 3
	}
	if has(v.Finishes, "etched") && len(v.Finishes) == 1 {
		s -= 5
	}

	if v.FullArt {
		s -= 4
	}
	if hasOpt(v.FrameEffects, "inverted") {
		s -= 3
	}
	if hasOpt(v.FrameEffects, "extendedart") {
		s -= 3
	}
	if hasOpt(v.FrameEffects, "etched") {
		s -= 3
	}

	if v.PromoTypes != nil {
		for _, pt := range *v.PromoTypes {
			if has(promoTypePenalties, pt) {
				s -= 6
			}
		}
	}

	if stats.modeIllustrationID != "" && safeString(v.IllustrationID) == stats.modeIllustrationID {
		s += 3
	}
	if _, ok := stats.topArtists[safeString(v.Artist)]; ok {
		s += 1
	}

	if v.IsDefault {
		s += 1
	}

	return s
}

func tieBreak(bestIdx, challengerIdx int, versions []scryfall.MTG_CardVersionDB) int {
	best := versions[bestIdx]
	challenger := versions[challengerIdx]

	bp := platformCount(best.Games)
	cp := platformCount(challenger.Games)
	if cp > bp {
		return challengerIdx
	}
	if cp < bp {
		return bestIdx
	}

	bNon := has(best.Finishes, "nonfoil")
	cNon := has(challenger.Finishes, "nonfoil")
	if cNon && !bNon {
		return challengerIdx
	}
	if bNon && !cNon {
		return bestIdx
	}

	if !challenger.FullArt && best.FullArt {
		return challengerIdx
	}
	if !best.FullArt && challenger.FullArt {
		return bestIdx
	}

	bInv := hasOpt(best.FrameEffects, "inverted")
	cInv := hasOpt(challenger.FrameEffects, "inverted")
	if !cInv && bInv {
		return challengerIdx
	}
	if !bInv && cInv {
		return bestIdx
	}

	bNum := intForCollectorNumber(best.CollectorNumber)
	cNum := intForCollectorNumber(challenger.CollectorNumber)
	if cNum < bNum {
		return challengerIdx
	}
	return bestIdx
}

// pickDefaultIndex computes a ranked score for each version and returns the
// best index. Ties are resolved deterministically via tieBreak.
func pickDefaultIndex(versions []scryfall.MTG_CardVersionDB) int {
	stats := computeGroupStats(versions)
	bestIdx := 0
	bestScore := math.MinInt
	for i := range versions {
		sc := scoreVersion(&versions[i], stats)
		if sc > bestScore {
			bestScore = sc
			bestIdx = i
		} else if sc == bestScore {
			bestIdx = tieBreak(bestIdx, i, versions)
		}
	}
	return bestIdx
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
