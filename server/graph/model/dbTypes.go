package model

// MTGApplicationConfig stores housekeeping information such as last fetch timestamps.
type MTGApplicationConfig struct {
	ID              string `json:"_key"`
	LastTimeFetched int    `json:"last_time_fetched"`
}

// MTGImportReportStatus describes the outcome of a background import job.
type MTGImportReportStatus string

const (
	// ImportReportStatusRunning indicates the job is still in progress when persisted.
	ImportReportStatusRunning MTGImportReportStatus = "running"
	// ImportReportStatusSuccess indicates the job completed without critical errors.
	ImportReportStatusSuccess MTGImportReportStatus = "success"
	// ImportReportStatusFailed indicates the job aborted due to an error.
	ImportReportStatusFailed MTGImportReportStatus = "failed"
	// ImportReportStatusSkipped indicates the job skipped execution (e.g., no delta).
	ImportReportStatusSkipped MTGImportReportStatus = "skipped"
)

// MTGImportReport captures metrics, status, and optional error details for daemon runs.
type MTGImportReport struct {
	ID               string                `json:"_key,omitempty"`
	JobName          string                `json:"job_name"`
	StartedAt        int                   `json:"started_at"`
	CompletedAt      *int                  `json:"completed_at,omitempty"`
	DurationMs       *int                  `json:"duration_ms,omitempty"`
	Status           MTGImportReportStatus `json:"status"`
	RecordsProcessed int                   `json:"records_processed"`
	ErrorMessage     *string               `json:"error_message,omitempty"`
	Metadata         map[string]any        `json:"metadata,omitempty"`
}

// MTGLegalitiesDiff captures legality status changes per import run.
type MTGLegalitiesDiff struct {
	ID             string  `json:"_key,omitempty"`
	ImportID       string  `json:"import_id"`
	JobName        string  `json:"job_name"`
	CardID         string  `json:"card_id"`
	CardName       string  `json:"card_name"`
	Format         string  `json:"format"`
	PreviousStatus *string `json:"previous_status,omitempty"`
	CurrentStatus  *string `json:"current_status,omitempty"`
	SetCode        *string `json:"set_code,omitempty"`
	SetName        *string `json:"set_name,omitempty"`
	ChangedAt      int     `json:"changed_at"`
}

// MTGDeckDB is the persisted form of a deck document in ArangoDB.
type MTGDeckDB struct {
	ID    string     `json:"_key"`
	Name  string     `json:"name"`
	Zones []FlowZone `json:"zones"`
	Type  DeckType   `json:"type"`
}

// MTGDeckFrontCardImageDB is an edge storing the chosen front image for a deck.
type MTGDeckFrontCardImageDB struct {
	ID        string `json:"_id"`
	From      string `json:"_from"`
	To        string `json:"_to"`
	VersionID string `json:"versionID"`
}

// MTGCardDeckDB is an edge that connects a card to a deck with metadata.
type MTGCardDeckDB struct {
	From              string          `json:"_from"`
	To                string          `json:"_to"`
	Count             int             `json:"count"`
	Position          Position        `json:"position"`
	MainOrSide        MainOrSide      `json:"mainOrSide"`
	DeckCardType      MtgDeckCardType `json:"deckCardType"`
	Phantoms          []Phantom       `json:"phantoms"`
	SelectedVersionID *string         `json:"selectedVersionID"`
}

// TagDB is the persisted tag document which can be a CardTag or DeckTag.
type TagDB struct {
	ID          string      `json:"_key,omitempty"`
	Type        TagType     `json:"type"`
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Colors      []*MtgColor `json:"colors,omitempty"`
}

// UserRatingDB is the edge storing a user's rating for a card or a tag.
type UserRatingDB struct {
	From  string `json:"_from"` // User
	To    string `json:"_to"`   // Card or Tag
	Value int    `json:"value"`
}

// ConvertMtgColorSlice converts []*MtgColor to a value slice to ease JSON marshalling.
func ConvertMtgColorSlice(colors []*MtgColor) []MtgColor {
	result := make([]MtgColor, len(colors))
	for i, c := range colors {
		result[i] = *c
	}
	return result
}
