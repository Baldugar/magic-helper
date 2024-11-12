package daemons

import (
	"context"
	"encoding/json"
	"io"
	"magic-helper/arango"
	"magic-helper/graph/model"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog/log"
)

func PeriodicFetchMTGASets() {
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
	shouldFetch, err := shouldDownloadStart("MTGA_sets")
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
		resp, err := http.Get(url)
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

	sets := []map[string]interface{}{}
	for _, set := range allSets {
		var setMap map[string]interface{}
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
	aq.AddBindVar("@collection", arango.MTGA_ORIGINAL_SETS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting sets into database")
		return false
	}

	// Update the last time we fetched sets
	err = updateLastTimeFetched("MTGA_sets")
	if err != nil {
		log.Error().Err(err).Msgf("Error updating last time fetched")
		return false
	}

	log.Info().Msgf("Inserted sets into database")
	log.Info().Msgf("Done")

	return true
}

func updateDatabaseSets() {
	log.Info().Msg("Updating database sets")

	ctx := context.Background()

	aq := arango.NewQuery( /* aql */ `
		FOR c IN @@collection
		RETURN c
	`)

	aq.AddBindVar("@collection", arango.MTGA_ORIGINAL_SETS_COLLECTION)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error querying database")
		return
	}

	defer cursor.Close()

	var importedSets []model.MTGA_ImportedSet
	for cursor.HasMore() {
		var set model.MTGA_ImportedSet
		_, err := cursor.ReadDocument(ctx, &set)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading document")
			return
		}
		importedSets = append(importedSets, set)
	}

	log.Info().Msgf("Read %v sets from database", len(importedSets))

	// Download all the set icons IconSVGURI. Format is https://svgs.scryfall.io/sets/dft.svg?1730696400
	for _, set := range importedSets {
		iconURL := set.IconSVGURI
		iconPath := "public/images/sets/" + set.Code + ".svg"

		// Check that the folders exist
		err := os.MkdirAll("public/images/sets", 0755)
		if err != nil {
			log.Error().Err(err).Msgf("Error creating set icon folder")
			return
		}

		// If the file already exists, skip
		if _, err := os.Stat(iconPath); err == nil {
			log.Info().Msgf("Set icon already exists: %v", iconPath)
			continue
		}

		resp, err := http.Get(iconURL)
		if err != nil {
			log.Error().Err(err).Msgf("Error fetching set icon")
			return
		}

		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Error fetching set icon: %v", resp.Status)
			return
		}

		iconFile, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Error().Err(err).Msgf("Error reading response body")
			return
		}

		err = os.WriteFile(iconPath, iconFile, 0644)
		if err != nil {
			log.Error().Err(err).Msgf("Error writing set icon")
			return
		}

		log.Info().Msgf("Downloaded set icon: %v", iconPath)
	}

	// Insert the data into the database
	var sets []model.MTGA_Set

	for _, set := range importedSets {
		s := model.MTGA_Set{
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
	aq.AddBindVar("@collection", arango.MTGA_SETS_COLLECTION)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msgf("Error inserting sets into database")
		return
	}

	log.Info().Msgf("Inserted sets into database")
}
