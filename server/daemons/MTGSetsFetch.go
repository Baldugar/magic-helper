package daemons

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model/scryfall"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// PeriodicFetchMTGSets runs a 24h loop fetching Scryfall sets and syncing them to DB.
func PeriodicFetchMTGSets() {
	log.Info().Msg("Starting periodic fetch sets daemon")
	for {
		runMTGSetsCycle(false)
		time.Sleep(24 * time.Hour)
	}
}

func runMTGSetsCycle(force bool) {
	ctx := context.Background()
	if fetchSets(ctx, force) {
		updateDatabaseSets()
	}
}

// fetchSets downloads all paginated Scryfall sets, stores originals, downloads icons,
// and updates the last-fetched timestamp.
func fetchSets(ctx context.Context, force bool) bool {
	log.Info().Msg("Fetching sets from Scryfall")
	url := "https://api.scryfall.com/sets"

	report := newImportReportBuilder("MTG_sets")
	defer report.Complete(ctx)
	report.AddMetadata("source", url)

	// Check if we should fetch sets
	shouldFetch := true
	var err error
	if !force {
		shouldFetch, err = shouldDownloadStart("MTG_sets")
		if err != nil {
			log.Error().Err(err).Msgf("Error checking if we should fetch sets")
			report.MarkFailed(err)
			return false
		}
	} else {
		report.AddMetadata("forced", true)
	}

	if !shouldFetch && !force {
		report.MarkSkipped("fetched in the last 24 hours")
		return false
	}

	var allSets []json.RawMessage
	pagesFetched := 0

	i := 1
	for {
		// Fetch the data from the API
		req, err := createScryfallRequest(url)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating request to Scryfall")
			report.MarkFailed(err)
			return false
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Error().Err(err).Msgf("Error fetching sets from Scryfall")
			report.MarkFailed(err)
			return false
		}

		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Error fetching sets from Scryfall: %v", resp.Status)
			report.MarkFailed(fmt.Errorf("unexpected status: %s", resp.Status))
			return false
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Error().Err(err).Msgf("Error reading response body")
			report.MarkFailed(err)
			return false
		}

		// Unmarshal the JSON
		var response ScryfallResponse
		err = json.Unmarshal(body, &response)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling response body")
			report.MarkFailed(err)
			return false
		}

		allSets = append(allSets, response.Data...)
		pagesFetched++

		if !response.HasMore {
			break
		}

		log.Info().Msgf("Fetched page %v", i)
		i++
		url = response.NextPage
		time.Sleep(100 * time.Millisecond)
	}

	log.Info().Msgf("Fetched %v sets", len(allSets))

	sets := []scryfall.Set{}
	for _, set := range allSets {
		var setMap scryfall.Set
		err := json.Unmarshal(set, &setMap)
		if err != nil {
			log.Error().Err(err).Str("set", string(set)).Msgf("Error unmarshalling set")
			report.MarkFailed(err)
			return false
		}
		sets = append(sets, setMap)
	}

	log.Info().Msgf("Unmarshalled %v sets", len(sets))
	report.SetRecordsProcessed(len(sets))
	report.AddMetadata("pages_fetched", pagesFetched)
	log.Info().Msgf("Inserting sets into database")

	// Insert the data into the database
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @sets
			UPSERT { _key: c.code }
			INSERT MERGE({ _key: c.code }, c)
			UPDATE c
			IN MTG_Original_Sets
	`)

	aq.AddBindVar("sets", sets)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting sets into database")
		report.MarkFailed(err)
		return false
	}

	// Download the icons
	iconErrors := 0
	for _, set := range sets {
		err := downloadSetIconIfNeeded(ctx, set)
		if err != nil {
			log.Error().Err(err).Msgf("Error downloading set icon for %s", set.Code)
			iconErrors++
		}
		time.Sleep(100 * time.Millisecond)
	}
	report.AddMetadata("icon_download_errors", iconErrors)

	// Update the last time we fetched sets
	err = updateLastTimeFetched("MTG_sets")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		report.MarkFailed(err)
		return false
	}

	log.Info().Msgf("Inserted sets into database")
	log.Info().Msgf("Done")

	return true
}

// downloadSetIconIfNeeded checks the current ETag via HEAD and only downloads
// the set icon if it changed. On success, it updates the stored ETag.
func downloadSetIconIfNeeded(ctx context.Context, set scryfall.Set) error {
	if set.IconSVGURI == "" {
		// If there's no icon URL, nothing to do
		return nil
	}

	// 1) Ensure local images folder exists
	err := os.MkdirAll("public/images/sets", 0755)
	if err != nil {
		return fmt.Errorf("error creating set icon folder: %w", err)
	}

	// 2) Make a HEAD request
	headReq, err := http.NewRequest(http.MethodHead, set.IconSVGURI, nil)
	if err != nil {
		return fmt.Errorf("error creating HEAD request: %w", err)
	}

	// If we have an ETag stored, send If-None-Match
	if set.ETag != "" {
		headReq.Header.Set("If-None-Match", set.ETag)
	}

	headResp, err := http.DefaultClient.Do(headReq)
	if err != nil {
		return fmt.Errorf("HEAD request failed for %s: %w", set.Code, err)
	}
	defer headResp.Body.Close()

	if headResp.StatusCode == http.StatusNotModified {
		// ETag is the same; skip re-download
		return nil
	}

	if headResp.StatusCode != http.StatusOK {
		// If we get anything else (404, 500, etc.) treat as error
		return fmt.Errorf("HEAD for set %s returned status %d", set.Code, headResp.StatusCode)
	}

	newETag := headResp.Header.Get("ETag")
	// log.Info().Msgf("HEAD for set %s returned ETag: %q (old ETag: %q)", set.Code, newETag, set.ETag)

	// 3) If ETag is empty or changed, do the actual GET
	if newETag == "" || newETag != set.ETag {
		err := doDownloadAndSave(ctx, set, newETag)
		if err != nil {
			return err
		}
	} else {
		// Sometimes servers return 200 but same ETag anyway
		log.Info().Msgf("Icon for set %s is unchanged (same ETag), skipping.", set.Code)
	}

	return nil
}

// doDownloadAndSave performs the GET request, saves the icon, and updates the ETag in DB.
func doDownloadAndSave(ctx context.Context, set scryfall.Set, newETag string) error {
	resp, err := http.Get(set.IconSVGURI)
	if err != nil {
		return fmt.Errorf("GET request failed for %s: %w", set.Code, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET for set %s returned status %d", set.Code, resp.StatusCode)
	}

	iconFile, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading response body for %s: %w", set.Code, err)
	}

	iconPath := "public/images/sets/" + set.Code + ".svg"
	err = os.WriteFile(iconPath, iconFile, 0644)
	if err != nil {
		return fmt.Errorf("writing set icon for %s: %w", set.Code, err)
	}

	// log.Info().Msgf("Downloaded set icon: %s (new ETag: %q)", iconPath, newETag)

	// Also update the ETag in Arango
	if err := updateSetETagInDB(ctx, set.Code, newETag); err != nil {
		return fmt.Errorf("updating ETag in DB for %s: %w", set.Code, err)
	}

	return nil
}

// updateSetETagInDB stores the latest ETag for a set code in MTG_Original_Sets.
func updateSetETagInDB(ctx context.Context, code, newETag string) error {
	aq := arango.NewQuery( /* aql */ `
		FOR s IN MTG_Original_Sets
			FILTER s._key == @key
			UPDATE s WITH { eTag: @etag } IN MTG_Original_Sets
	`)

	aq.AddBindVar("key", code)
	aq.AddBindVar("etag", newETag)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return fmt.Errorf("arango query error: %w", err)
	}

	return nil
}

// updateDatabaseSets transforms original sets to the app schema and upserts into MTG_Sets.
func updateDatabaseSets() {
	ctx := context.Background()
	log.Info().Msg("Updating database sets")

	aq := arango.NewQuery( /* aql */ `
		FOR s IN MTG_Original_Sets
			RETURN s
	`)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying database")
		return
	}
	defer cursor.Close()

	var sets []scryfall.Set

	for cursor.HasMore() {
		var set scryfall.Set
		_, err := cursor.ReadDocument(ctx, &set)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return
		}
		sets = append(sets, set)
	}

	log.Info().Msgf("Found %v sets", len(sets))

	dbSets := make([]scryfall.MTG_SetDB, len(sets))
	for i, set := range sets {
		dbSets[i] = scryfall.MTG_SetDB{
			ID:            strings.ToLower(set.Code),
			Name:          set.Name,
			Code:          set.Code,
			ReleasedAt:    set.ReleasedAt,
			IconSVGURI:    set.IconSVGURI,
			ETag:          set.ETag,
			MTGOCode:      set.MTGOCode,
			ArenaCode:     set.ArenaCode,
			TCGPlayerID:   set.TCGPlayerID,
			CardCount:     set.CardCount,
			Digital:       set.Digital,
			NonFoilOnly:   set.NonFoilOnly,
			SetType:       set.SetType.String(),
			Block:         set.Block,
			BlockCode:     set.BlockCode,
			ParentSetCode: set.ParentSetCode,
			PrintedSize:   set.PrintedSize,
			FoilOnly:      set.FoilOnly,
			ScryfallURI:   set.ScryfallURI,
			URI:           set.URI,
			SearchURI:     set.SearchURI,
		}
	}

	aq = arango.NewQuery( /* aql */ `
		FOR s IN @sets
			UPSERT { _key: s._key }
			INSERT MERGE({ _key: s._key }, s)
			UPDATE s
			IN MTG_Sets
	`)

	aq.AddBindVar("sets", dbSets)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error updating database sets")
	}

	log.Info().Msgf("Updated database sets")
	log.Info().Msgf("Done")
}
func RunMTGSetsImport(ctx context.Context, force bool) {
	if ctx == nil {
		ctx = context.Background()
	}
	log.Info().Bool("force", force).Msg("Manual MTG sets import triggered")
	if fetchSets(ctx, force) {
		updateDatabaseSets()
	}
}
