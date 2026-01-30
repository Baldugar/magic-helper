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
		runMTGCardsCycle(ctx)

		time.Sleep(24 * time.Hour)
	}
}

// fetchMTGCards checks whether a new download is needed and, if so, locates
// the "default_cards" bulk dataset and processes it.
func fetchMTGCards(ctx context.Context) bool {
	log.Info().Msg("Fetching cards from Scryfall bulk data endpoint")
	bulkDataUrl := "https://api.scryfall.com/bulk-data"

	// Check if we should fetch cards
	shouldFetch := true
	var err error
	shouldFetch, err = shouldDownloadStart("MTG_cards")
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

// fetchAndProcessCardData fetches a bulk JSON file of cards and incrementally
// decodes and upserts them into Arango in batches while logging progress.
// It returns the number of card documents processed.
func fetchAndProcessCardData(ctx context.Context, downloadURI string) error {
	respData, err := fetchURLWithContext(ctx, downloadURI)
	if err != nil {
		log.Error().Err(err).Msgf("Error fetching card data file from %s", downloadURI)
		return err
	}
	defer respData.Body.Close()

	bodyBytes, err := io.ReadAll(respData.Body)
	if err != nil {
		log.Error().Err(err).Msg("Error reading response body")
		return err
	}

	if err := downloadFile(bytes.NewReader(bodyBytes), "cards.json"); err != nil {
		log.Error().Err(err).Msgf("Error downloading card data file from %s", downloadURI)
		return err
	}

	contentLengthStr := respData.Header.Get("Content-Length")
	totalSize, _ := strconv.ParseInt(contentLengthStr, 10, 64)

	if totalSize > 0 {
		log.Info().Msgf("Starting download of card data file (%d bytes)...", totalSize)
	} else {
		log.Info().Msg("Starting download of card data file (size unknown)...")
	}

	progressReader := NewProgressReader(bytes.NewReader(bodyBytes), totalSize)
	log.Info().Msgf("Processing cards from %v", downloadURI)
	decoder := json.NewDecoder(progressReader)

	if _, err = decoder.Token(); err != nil {
		if err == io.EOF && progressReader.ReadSoFar == 0 {
			log.Error().Msg("Download stream empty or failed immediately.")
		} else {
			log.Error().Err(err).Msg("Error decoding card data: expecting start of array `[`")
		}
		return err
	}

	batchSize := 1000

	for decoder.More() {
		var batchRaw []json.RawMessage
		for len(batchRaw) < batchSize && decoder.More() {
			var cardRaw json.RawMessage
			if err := decoder.Decode(&cardRaw); err != nil {
				if err == io.EOF {
					break
				}
				log.Error().Err(err).Msgf("Error decoding card JSON object")
				return err
			}
			batchRaw = append(batchRaw, cardRaw)
		}

		if len(batchRaw) == 0 {
			continue
		}

		parsedArr, parseErr := parseCardsFromRaw(batchRaw)
		if parseErr != nil {
			log.Error().Err(parseErr).Msgf("Error parsing raw cards batch")
			return parseErr
		}

		aq := arango.NewQuery( /* aql */ `
			FOR c IN @cards
				UPSERT { _key: c.id }
					INSERT MERGE({ _key: c.id }, c)
					UPDATE MERGE(OLD, c)
				IN mtg_original_cards
		`)
		aq.AddBindVar("cards", parsedArr)

		_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
		if err != nil {
			log.Error().Err(err).Msg("failed to upsert cards with diff")
			return err
		}

	}

	log.Info().Msgf("Finished processing cards from %s.", downloadURI)

	return nil
}

// collectCards rebuilds the curated mtg_cards collection from mtg_original_cards
// by grouping variants and picking a default version per group.
func collectCards(ctx context.Context) {
	log.Info().Msg("Collecting cards")

	// Clear the collection
	aq := arango.NewQuery( /* aql */ `
		FOR c IN mtg_cards
			REMOVE c IN mtg_cards
	`)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("Error clearing collection")
	}

	// Collect the cards
	aq = arango.NewQuery( /* aql */ `
	FOR c IN mtg_original_cards
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

		// First we create the card with the common fields
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

		// If the card has no color identity, we set it to C (Colorless)
		if len(cardForGroup.ColorIdentity) == 0 {
			cardForGroup.ColorIdentity = []string{"C"}
		}

		// Then we create the versions for the card, selecting the best version based on the score function to be the default
		for _, card := range filteredGroupCards {
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

			if card.PrintedName != nil {
				cardVersionDB.PrintedName = *card.PrintedName
			} else {
				cardVersionDB.PrintedName = card.Name
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
			IN mtg_cards
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

// containsGame checks whether target exists in the list of game platforms.
func containsGame(games []scryfallModel.Game, target string) bool {
	for _, g := range games {
		if string(g) == target {
			return true
		}
	}
	return false
}

type groupStats struct {
	// Only set when there is a "real" mode (count > 1).
	modeIllustrationID string
	// Only set when there is a "real" top artist (count > 1).
	topArtists map[string]struct{}
}

func computeGroupStats(versions []scryfall.MTG_CardVersionDB) groupStats {
	illCount := make(map[string]int)
	artistCount := make(map[string]int)

	for _, v := range versions {
		if id := safeString(v.IllustrationID); id != "" {
			illCount[id]++
		}
		if artist := safeString(v.Artist); artist != "" {
			artistCount[artist]++
		}
	}

	stats := groupStats{
		topArtists: make(map[string]struct{}),
	}

	// Illustration mode: only meaningful if some illustration appears more than once.
	// Deterministic tie-break: lexicographically smallest illustrationID.
	bestIllCount := 0
	bestIllID := ""
	for id, c := range illCount {
		if c > bestIllCount || (c == bestIllCount && bestIllCount > 0 && id < bestIllID) {
			bestIllCount = c
			bestIllID = id
		}
	}
	if bestIllCount > 1 {
		stats.modeIllustrationID = bestIllID
	}

	// Top artists: only meaningful if some artist appears more than once.
	maxArtist := 0
	for _, c := range artistCount {
		if c > maxArtist {
			maxArtist = c
		}
	}
	if maxArtist > 1 {
		for artist, c := range artistCount {
			if c == maxArtist {
				stats.topArtists[artist] = struct{}{}
			}
		}
	}

	return stats
}

var promoTypePenalties = []string{
	"portrait", "ripplefoil", "boosterfun", "showcase", "serial", "halo", "galaxy", "neon", "stainedglass",
}

// pickDefaultIndex returns the best version index using a strict, deterministic ordering.
// It uses a lexicographic comparator instead of scoreVersion+tieBreak.
func pickDefaultIndex(versions []scryfall.MTG_CardVersionDB) int {
	stats := computeGroupStats(versions)
	bestIdx := 0
	for i := 1; i < len(versions); i++ {
		if defaultLess(versions[i], versions[bestIdx], stats) {
			bestIdx = i
		}
	}
	return bestIdx
}

// defaultLess returns true if a should be preferred as the default over b.
func defaultLess(a, b scryfall.MTG_CardVersionDB, stats groupStats) bool {
	// 1) Language (prefer English; future-proof when you remove AQL lang filter)
	if ar, br := langRank(a.Lang), langRank(b.Lang); ar != br {
		return ar < br
	}

	// 2) Prefer non-alchemy
	if a.IsAlchemy != b.IsAlchemy {
		return !a.IsAlchemy
	}

	// 3) Prefer paper > mtgo > arena > none
	if ar, br := gameRank(a.Games), gameRank(b.Games); ar != br {
		return ar < br
	}

	// 4) Prefer "normal" set types (expansion/core first, then masters, commander, etc.)
	if ar, br := setTypeRank(a.SetType), setTypeRank(b.SetType); ar != br {
		return ar < br
	}

	// 5) Prefer booster-available printings (more "normal")
	if a.Booster != b.Booster {
		return a.Booster
	}

	// 6) Prefer non-promo / non-showcase / non-boosterfun etc.
	if ar, br := promoPenalty(a.PromoTypes), promoPenalty(b.PromoTypes); ar != br {
		return ar < br
	}

	// 7) Prefer base (non-variation) printings
	if ar, br := baseVariationRank(a), baseVariationRank(b); ar != br {
		return ar < br
	}

	// 8) Prefer non-fullart
	if a.FullArt != b.FullArt {
		return !a.FullArt
	}

	// 9) Prefer "clean" frame effects (avoid inverted/extendedart/etched frames)
	if ar, br := framePenalty(a.FrameEffects), framePenalty(b.FrameEffects); ar != br {
		return ar < br
	}

	// 10) Prefer nonfoil availability; avoid etched-only
	if ar, br := finishRank(a.Finishes), finishRank(b.Finishes); ar != br {
		return ar < br
	}

	// 11) Prefer the group's "reused" art, if any (count > 1)
	if stats.modeIllustrationID != "" {
		am := safeString(a.IllustrationID) == stats.modeIllustrationID
		bm := safeString(b.IllustrationID) == stats.modeIllustrationID
		if am != bm {
			return am
		}
	}

	// 12) Prefer the most common artist in the group, if any (count > 1)
	if len(stats.topArtists) > 0 {
		_, aTop := stats.topArtists[safeString(a.Artist)]
		_, bTop := stats.topArtists[safeString(b.Artist)]
		if aTop != bTop {
			return aTop
		}
	}

	// 13) Prefer more recent printing (gives modern frame by default)
	if ar, br := releasedAtUnix(a.ReleasedAt), releasedAtUnix(b.ReleasedAt); ar != br {
		return ar > br
	}

	// 14) Stable ordering across sets
	if a.Set != b.Set {
		return a.Set < b.Set
	}

	// 15) Prefer lower collector number (within a set), supporting suffixes like "123a"
	aNum, aSuf := splitCollectorNumber(a.CollectorNumber)
	bNum, bSuf := splitCollectorNumber(b.CollectorNumber)
	if aNum != bNum {
		return aNum < bNum
	}
	if aSuf != bSuf {
		return aSuf < bSuf
	}

	// 16) Final stable tie-breaker
	return a.ID < b.ID
}

func langRank(l scryfallModel.CardLanguage) int {
	// Prefer English; keep others stable.
	if strings.ToLower(string(l)) == "en" {
		return 0
	}
	return 1
}

func gameRank(games []scryfallModel.Game) int {
	// Lower is better.
	if containsGame(games, "paper") {
		return 0
	}
	if containsGame(games, "mtgo") {
		return 1
	}
	if containsGame(games, "arena") {
		return 2
	}
	return 3
}

func setTypeRank(setType string) int {
	// Lower is better. This is intentionally opinionated:
	// prefer "real" pack sets first, then other constructed products, then esoteric.
	switch strings.ToLower(setType) {
	case "core", "expansion":
		return 0
	case "masters":
		return 1
	case "draft_innovation":
		return 2
	case "commander":
		return 3
	case "duel_deck", "from_the_vault", "premium_deck", "starter", "box", "planechase", "archenemy":
		return 4
	case "alchemy":
		return 10
	case "promo", "funny", "memorabilia", "vanguard", "token":
		return 100
	default:
		return 50
	}
}

func promoPenalty(promoTypes *[]string) int {
	if promoTypes == nil || len(*promoTypes) == 0 {
		return 0
	}

	// Base penalty for "any promo types", plus extra for known "special frames / treatments".
	p := 10
	for _, pt := range *promoTypes {
		if has(promoTypePenalties, pt) {
			p += 20
		}
	}
	return p
}

func baseVariationRank(v scryfall.MTG_CardVersionDB) int {
	// Lower is better.
	// "base" means not a variation and not explicitly a variation of another printing.
	if !v.Variation && v.VariationOf == nil {
		return 0
	}
	return 1
}

func framePenalty(frameEffects *[]string) int {
	// Lower is better. Larger penalties for more "weird" treatments.
	if frameEffects == nil || len(*frameEffects) == 0 {
		return 0
	}
	p := 0
	if has(*frameEffects, "inverted") {
		p += 100
	}
	if has(*frameEffects, "extendedart") {
		p += 60
	}
	if has(*frameEffects, "etched") {
		p += 50
	}
	return p
}

func finishRank(finishes []string) int {
	// Lower is better:
	// 0: has nonfoil
	// 1: has foil (but no nonfoil)
	// 2: etched-only or other weird-only
	if has(finishes, "nonfoil") {
		return 0
	}
	if has(finishes, "foil") {
		return 1
	}
	// "etched" only (or no standard finishes)
	return 2
}

func releasedAtUnix(releasedAt string) int64 {
	// Scryfall is typically YYYY-MM-DD
	t, err := time.Parse("2006-01-02", releasedAt)
	if err != nil {
		return 0
	}
	return t.Unix()
}

func splitCollectorNumber(cn string) (num int, suffix string) {
	// Supports "123", "123a", "001", etc.
	i := 0
	for i < len(cn) && cn[i] >= '0' && cn[i] <= '9' {
		i++
	}
	if i == 0 {
		return math.MaxInt32, cn
	}
	n, err := strconv.Atoi(cn[:i])
	if err != nil {
		return math.MaxInt32, cn
	}
	return n, cn[i:]
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
func runMTGCardsCycle(ctx context.Context) {
	fetched := fetchMTGCards(ctx)
	if fetched {
		collectCards(ctx)
		return
	}
	rebuildCardIndex(ctx)
}

func rebuildCardIndex(ctx context.Context) {
	cards, err := mtg.GetMTGCards(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Error fetching cards")
		return
	}
	if err := mtgCardSearch.BuildCardIndexWithCards(cards); err != nil {
		log.Error().Err(err).Msg("Error building card index")
	}
}
func RunMTGCardsImport(ctx context.Context) {
	if ctx == nil {
		ctx = context.Background()
	}
	log.Info().Msg("Manual MTG cards import triggered")
	runMTGCardsCycle(ctx)
}
