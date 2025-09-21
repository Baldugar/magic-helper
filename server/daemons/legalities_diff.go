package daemons

import (
	"context"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

const legalityDiffJobName = "MTG_cards"

func upsertCardsWithDiff(ctx context.Context, cards []map[string]any, importID string, importTimestamp int) ([]model.MTGLegalitiesDiff, error) {
	snapshots, err := fetchLegalitiesSnapshot(ctx, extractCardIDs(cards))
	if err != nil {
		return nil, err
	}

	diffs := make([]model.MTGLegalitiesDiff, 0)

	for _, card := range cards {
		cardID, _ := card["id"].(string)
		newLegalities := normalizeLegalities(card["legalities"])
		snapshot := snapshots[cardID]
		changes := computeLegalitiesDiff(snapshot.legalities, newLegalities)

		card["legalities_updated_at"] = importTimestamp

		if len(changes) == 0 {
			continue
		}

		if len(snapshot.legalities) > 0 {
			card["previous_legalities"] = snapshot.legalities
		}
		if snapshot.lastImportID != nil {
			card["previous_legalities_import_id"] = *snapshot.lastImportID
		}
		card["last_legality_change_import_id"] = importID
		card["last_legality_change_at"] = importTimestamp

		cardName, _ := card["name"].(string)
		setCode := optionalString(card["set"])
		setName := optionalString(card["set_name"])

		for _, change := range changes {
			diffs = append(diffs, model.MTGLegalitiesDiff{
				ID:             util.UUID4(),
				ImportID:       importID,
				JobName:        legalityDiffJobName,
				CardID:         cardID,
				CardName:       cardName,
				Format:         change.format,
				PreviousStatus: change.prev,
				CurrentStatus:  change.curr,
				SetCode:        setCode,
				SetName:        setName,
				ChangedAt:      importTimestamp,
			})
		}
	}

	aq := arango.NewQuery( /* aql */ `
        FOR c IN @cards
            UPSERT { _key: c.id }
                INSERT MERGE({ _key: c.id }, c)
                UPDATE MERGE(OLD, c)
            IN MTG_Original_Cards
    `)
	aq.AddBindVar("cards", cards)

	_, err = arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("failed to upsert cards with diff")
		return nil, err
	}

	return diffs, nil
}

type legalitySnapshot struct {
	legalities   map[string]string
	lastImportID *string
}

type legalityChange struct {
	format string
	prev   *string
	curr   *string
}

func fetchLegalitiesSnapshot(ctx context.Context, ids []string) (map[string]legalitySnapshot, error) {
	snapshots := make(map[string]legalitySnapshot, len(ids))
	if len(ids) == 0 {
		return snapshots, nil
	}

	aq := arango.NewQuery( /* aql */ `
        FOR cardID IN @ids
            LET doc = DOCUMENT(MTG_Original_Cards, cardID)
            RETURN {
                id: cardID,
                legalities: doc == null ? null : doc.legalities,
                lastImportID: doc == null ? null : doc.last_legality_change_import_id
            }
    `)
	aq.AddBindVar("ids", ids)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	for cursor.HasMore() {
		var row struct {
			ID         string         `json:"id"`
			Legalities map[string]any `json:"legalities"`
			LastImport *string        `json:"lastImportID"`
		}
		if _, err := cursor.ReadDocument(ctx, &row); err != nil {
			return nil, err
		}
		snapshots[row.ID] = legalitySnapshot{
			legalities:   normalizeLegalities(row.Legalities),
			lastImportID: row.LastImport,
		}
	}

	for _, id := range ids {
		if _, ok := snapshots[id]; !ok {
			snapshots[id] = legalitySnapshot{legalities: make(map[string]string)}
		}
	}

	return snapshots, nil
}

func computeLegalitiesDiff(previous, current map[string]string) []legalityChange {
	changes := make([]legalityChange, 0)
	seen := make(map[string]struct{})
	for format := range previous {
		seen[format] = struct{}{}
	}
	for format := range current {
		seen[format] = struct{}{}
	}

	for format := range seen {
		prevVal, prevOK := previous[format]
		currVal, currOK := current[format]
		if prevOK && currOK && prevVal == currVal {
			continue
		}
		change := legalityChange{format: format}
		if prevOK {
			v := prevVal
			change.prev = &v
		}
		if currOK {
			v := currVal
			change.curr = &v
		}
		changes = append(changes, change)
	}

	return changes
}

func normalizeLegalities(raw any) map[string]string {
	result := make(map[string]string)
	switch value := raw.(type) {
	case map[string]any:
		for k, v := range value {
			if str, ok := v.(string); ok {
				result[k] = str
			}
		}
	case map[string]string:
		for k, v := range value {
			result[k] = v
		}
	}
	return result
}

func optionalString(raw any) *string {
	if str, ok := raw.(string); ok {
		if str == "" {
			return nil
		}
		return &str
	}
	return nil
}

func extractCardIDs(cards []map[string]any) []string {
	ids := make([]string, 0, len(cards))
	for _, card := range cards {
		if id, ok := card["id"].(string); ok {
			ids = append(ids, id)
		}
	}
	return ids
}

func persistLegalitiesDiffs(ctx context.Context, importID string, diffs []model.MTGLegalitiesDiff) error {
	aq := arango.NewQuery( /* aql */ `
        FOR diff IN MTG_Legality_Diffs
            FILTER diff.import_id == @importID
            REMOVE diff IN MTG_Legality_Diffs
    `)
	aq.AddBindVar("importID", importID)
	if _, err := arango.DB.Query(ctx, aq.Query, aq.BindVars); err != nil {
		return err
	}

	if len(diffs) == 0 {
		return nil
	}

	col, err := arango.EnsureDocumentCollection(ctx, arango.MTG_LEGALITY_DIFFS_COLLECTION)
	if err != nil {
		return err
	}

	batch := make([]model.MTGLegalitiesDiff, 0, len(diffs))
	for _, diff := range diffs {
		if diff.ID == "" {
			diff.ID = util.UUID4()
		}
		batch = append(batch, diff)
	}

	_, errs, err := col.CreateDocuments(ctx, batch)
	if err != nil {
		return err
	}
	for _, e := range errs {
		if e != nil {
			log.Error().Err(e).Msg("failed to persist legality diff")
		}
	}

	return nil
}
