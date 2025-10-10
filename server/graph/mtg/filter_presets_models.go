package mtg

import "magic-helper/graph/model"

type MTGFilterPresetDB struct {
	ID      string                      `json:"_key"`
	DeckID  string                      `json:"deckID"`
	OwnerID *string                     `json:"ownerID,omitempty"`
	Name    string                      `json:"name"`
	SavedAt string                      `json:"savedAt"`
	Filter  map[string]any              `json:"filter"`
	Sort    []*model.MtgFilterSortState `json:"sort"`
	Page    int                         `json:"page"`
}

func (db *MTGFilterPresetDB) ToModel() *model.MtgFilterPreset {
	if db == nil {
		return nil
	}
	return &model.MtgFilterPreset{
		ID:      db.ID,
		DeckID:  db.DeckID,
		OwnerID: db.OwnerID,
		Name:    db.Name,
		SavedAt: db.SavedAt,
		Filter:  db.Filter,
		Sort:    db.Sort,
		Page:    db.Page,
	}
}

func sortInputToState(input []*model.MtgFilterSortInput) []*model.MtgFilterSortState {
	if input == nil {
		return nil
	}
	states := make([]*model.MtgFilterSortState, 0, len(input))
	for _, item := range input {
		if item == nil {
			continue
		}
		states = append(states, &model.MtgFilterSortState{
			SortBy:        item.SortBy,
			SortDirection: item.SortDirection,
			Enabled:       item.Enabled,
		})
	}
	return states
}
