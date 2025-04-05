package daemons

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog/log"
)

func PeriodicFetchMTGSets() {
	log.Info().Msg("Starting periodic fetch sets daemon")
	for {
		fetched := fetchSets()
		if fetched {
			updateDatabaseSets()
		}
		time.Sleep(24 * time.Hour)
	}
}

func fetchSets() bool {
	log.Info().Msg("Fetching sets from Scryfall")
	url := "https://api.scryfall.com/sets"

	ctx := context.Background()

	// Check if we should fetch sets
	shouldFetch, err := shouldDownloadStart("MTG_sets")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch sets")
		return false
	}

	if !shouldFetch {
		return false
	}

	var allSets []json.RawMessage

	i := 1
	for {
		// Fetch the data from the API
		req, err := createScryfallRequest(url)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating request to Scryfall")
			return false
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Error().Err(err).Msgf("Error fetching sets from Scryfall")
			return false
		}

		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Error fetching sets from Scryfall: %v", resp.Status)
			return false
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Error().Err(err).Msgf("Error reading response body")
			return false
		}

		// Unmarshal the JSON
		var response ScryfallResponse
		err = json.Unmarshal(body, &response)
		if err != nil {
			log.Error().Err(err).Msgf("Error unmarshalling response body")
			return false
		}

		allSets = append(allSets, response.Data...)

		if !response.HasMore {
			break
		}

		log.Info().Msgf("Fetched page %v", i)
		i++
		url = response.NextPage
		time.Sleep(100 * time.Millisecond)
	}

	log.Info().Msgf("Fetched %v sets", len(allSets))

	sets := []map[string]any{}
	for _, set := range allSets {
		var setMap map[string]any
		err := json.Unmarshal(set, &setMap)
		if err != nil {
			log.Error().Err(err).Str("set", string(set)).Msgf("Error unmarshalling set")
			return false
		}
		sets = append(sets, setMap)
	}

	log.Info().Msgf("Unmarshalled %v sets", len(sets))
	log.Info().Msgf("Inserting sets into database")

	// Insert the data into the database
	aq := arango.NewQuery( /* aql */ `
		FOR c IN @sets
			UPSERT { _key: c.code }
			INSERT MERGE({ _key: c.code }, c)
			UPDATE c
			IN @@collection
	`)

	aq.AddBindVar("sets", sets)
	aq.AddBindVar("@collection", arango.MTG_ORIGINAL_SETS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting sets into database")
		return false
	}

	// Update the last time we fetched sets
	err = updateLastTimeFetched("MTG_sets")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		return false
	}

	log.Info().Msgf("Inserted sets into database")
	log.Info().Msgf("Done")

	return true
}

// updateDatabaseSets fetches all sets from the DB (arango.MTGA_ORIGINAL_SETS_COLLECTION),
// then conditionally downloads their icons using an ETag check.
func updateDatabaseSets() {
	log.Info().Msg("Updating database sets")

	ctx := context.Background()

	aq := arango.NewQuery( /* aql */ `
		FOR c IN @@collection
		RETURN c
	`)

	aq.AddBindVar("@collection", arango.MTG_ORIGINAL_SETS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying database")
		return
	}

	defer cursor.Close()

	var importedSets []model.MTG_ImportedSet
	for cursor.HasMore() {
		var set model.MTG_ImportedSet
		_, err := cursor.ReadDocument(ctx, &set)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return
		}
		importedSets = append(importedSets, set)
	}
	log.Info().Msgf("Read %v sets from database", len(importedSets))

	// Download or skip icons based on ETag
	for i := range importedSets {
		set := &importedSets[i]
		err := downloadSetIconIfNeeded(ctx, set)
		if err != nil {
			log.Error().Err(err).Msgf("Error downloading set icon for %s", set.Code)
			continue
		}
	}

	// Insert the data into the database
	var sets []model.MTG_Set

	for _, set := range importedSets {
		s := model.MTG_Set{
			ID:            set.Code,
			ArenaCode:     set.ArenaCode,
			Block:         set.Block,
			BlockCode:     set.BlockCode,
			CardCount:     set.CardCount,
			Code:          set.Code,
			Digital:       set.Digital,
			FoilOnly:      set.FoilOnly,
			IconSVGURI:    "public/images/sets/" + set.Code + ".svg",
			MTGOCode:      set.MTGOCode,
			Name:          set.Name,
			NonFoilOnly:   set.NonFoilOnly,
			ParentSetCode: set.ParentSetCode,
			PrintedSize:   set.PrintedSize,
			ReleasedAt:    set.ReleasedAt,
			ScryfallURI:   set.ScryfallURI,
			SearchURI:     set.SearchURI,
			SetType:       set.SetType,
			TCGPlayerID:   set.TCGPlayerID,
			URI:           set.URI,
		}

		sets = append(sets, s)
	}

	log.Info().Msgf("Unmarshalled %v sets", len(sets))

	aq = arango.NewQuery( /* aql */ `
		FOR s IN @sets
			UPSERT { _key: s.code }
			INSERT s
			UPDATE s
			IN @@collection
	`)

	aq.AddBindVar("sets", sets)
	aq.AddBindVar("@collection", arango.MTG_SETS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting sets into database")
		return
	}

	log.Info().Msgf("Inserted sets into database")
}

// downloadSetIconIfNeeded uses a HEAD request with If-None-Match (ETag) to see
// if the icon changed. If server returns 304 Not Modified, it skips. Otherwise,
// it downloads the file, then updates the ETag in DB.
func downloadSetIconIfNeeded(ctx context.Context, set *model.MTG_ImportedSet) error {
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

// doDownloadAndSave does the actual GET request, saves the file, and updates the ETag in DB.
func doDownloadAndSave(ctx context.Context, set *model.MTG_ImportedSet, newETag string) error {
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

	// Update ETag in-memory
	set.ETag = newETag

	// Also update the ETag in Arango
	if err := updateSetETagInDB(ctx, set.Code, newETag); err != nil {
		return fmt.Errorf("updating ETag in DB for %s: %w", set.Code, err)
	}

	return nil
}

// updateSetETagInDB runs an AQL query to store the new ETag in your "MTGA_ORIGINAL_SETS_COLLECTION".
func updateSetETagInDB(ctx context.Context, code, newETag string) error {
	aq := arango.NewQuery( /* aql */ `
		FOR s IN @@collection
			FILTER s._key == @key
			UPDATE s WITH { eTag: @etag } IN @@collection
	`)

	aq.AddBindVar("@collection", arango.MTG_ORIGINAL_SETS_COLLECTION)
	aq.AddBindVar("key", code)
	aq.AddBindVar("etag", newETag)

	_, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return fmt.Errorf("arango query error: %w", err)
	}

	return nil
}
