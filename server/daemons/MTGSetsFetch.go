package daemons

import (
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model/scryfall"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// PeriodicFetchMTGSets runs a 24h loop fetching Scryfall sets and syncing them to DB.
func PeriodicFetchMTGSets() {
	log.Info().Msg("Starting periodic fetch sets daemon")
	for {
		runMTGSetsCycle()
		time.Sleep(24 * time.Hour)
	}
}

func runMTGSetsCycle() {
	ctx := context.Background()
	if fetchSets(ctx) {
		updateDatabaseSets()
	}
}

// fetchSets downloads all paginated Scryfall sets, stores originals, downloads icons,
// and updates the last-fetched timestamp.
func fetchSets(ctx context.Context) bool {
	log.Info().Msg("Fetching sets from Scryfall")
	url := "https://api.scryfall.com/sets"

	// Check if we should fetch sets
	shouldFetch := true
	var err error
	shouldFetch, err = shouldDownloadStart("MTG_sets")
	if err != nil {
		log.Error().Err(err).Msgf("Error checking if we should fetch sets")
		return false
	}

	if !shouldFetch {
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
			IN mtg_original_sets
	`)

	aq.AddBindVar("sets", sets)

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

// updateDatabaseSets transforms original sets to the app schema and upserts into MTG_Sets.
func updateDatabaseSets() {
	ctx := context.Background()
	log.Info().Msg("Updating database sets")

	aq := arango.NewQuery( /* aql */ `
		FOR s IN mtg_original_sets
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
			IN mtg_sets
	`)

	aq.AddBindVar("sets", dbSets)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error updating database sets")
	}

	log.Info().Msgf("Updated database sets")
	log.Info().Msgf("Done")
}
