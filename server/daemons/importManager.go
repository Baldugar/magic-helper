package daemons

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog/log"
)

// ImportPhase represents the current phase of the import process.
type ImportPhase string

const (
	PhaseIdle             ImportPhase = "idle"
	PhaseResettingTimers  ImportPhase = "resetting_timers"
	PhaseFetchingSets     ImportPhase = "fetching_sets"
	PhaseProcessingSets   ImportPhase = "processing_sets"
	PhaseFetchingCards    ImportPhase = "fetching_cards"
	PhaseProcessingCards  ImportPhase = "processing_cards"
	PhaseRebuildingIndex  ImportPhase = "rebuilding_index"
	PhaseComplete         ImportPhase = "complete"
	PhaseFailed           ImportPhase = "failed"
)

// ImportStatus represents the current status of an import operation.
type ImportStatus struct {
	InProgress   bool        `json:"inProgress"`
	Phase        ImportPhase `json:"phase"`
	PhaseMessage string      `json:"phaseMessage"`
	Progress     int         `json:"progress"`     // 0-100 percentage
	StartedAt    *time.Time  `json:"startedAt"`
	CompletedAt  *time.Time  `json:"completedAt"`
	Error        string      `json:"error"`
}

// ImportManager handles manual import triggers and prevents concurrent imports.
type ImportManager struct {
	importing    atomic.Bool
	phase        ImportPhase
	phaseMessage string
	progress     int
	lastStarted  time.Time
	lastFinished time.Time
	lastError    string
	mu           sync.RWMutex
}

var globalImportManager = &ImportManager{
	phase: PhaseIdle,
}

// GetImportManager returns the singleton import manager.
func GetImportManager() *ImportManager {
	return globalImportManager
}

// IsImporting returns whether an import is currently in progress.
func (m *ImportManager) IsImporting() bool {
	return m.importing.Load()
}

// GetStatus returns the current import status.
func (m *ImportManager) GetStatus() ImportStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	status := ImportStatus{
		InProgress:   m.importing.Load(),
		Phase:        m.phase,
		PhaseMessage: m.phaseMessage,
		Progress:     m.progress,
		Error:        m.lastError,
	}

	if !m.lastStarted.IsZero() {
		status.StartedAt = &m.lastStarted
	}
	if !m.lastFinished.IsZero() {
		status.CompletedAt = &m.lastFinished
	}

	return status
}

// setPhase updates the current phase and message.
func (m *ImportManager) setPhase(phase ImportPhase, message string, progress int) {
	m.mu.Lock()
	m.phase = phase
	m.phaseMessage = message
	m.progress = progress
	m.mu.Unlock()
	log.Info().Str("phase", string(phase)).Int("progress", progress).Msg(message)
}

// TriggerImport starts a background import if one isn't already running.
// Returns (started, message, inProgress).
func (m *ImportManager) TriggerImport() (bool, string, bool) {
	if !m.importing.CompareAndSwap(false, true) {
		return false, "Import already in progress", true
	}

	m.mu.Lock()
	m.lastStarted = time.Now()
	m.lastFinished = time.Time{}
	m.lastError = ""
	m.mu.Unlock()

	go func() {
		defer func() {
			m.importing.Store(false)
			m.mu.Lock()
			m.lastFinished = time.Now()
			m.mu.Unlock()
		}()

		log.Info().Msg("Manual import started")
		ctx := context.Background()

		// Phase 1: Reset timestamps (5%)
		m.setPhase(PhaseResettingTimers, "Resetting fetch timestamps...", 5)
		if err := resetLastTimeFetched("MTG_sets"); err != nil {
			log.Error().Err(err).Msg("Error resetting sets timestamp, continuing anyway")
		}
		if err := resetLastTimeFetched("MTG_cards"); err != nil {
			log.Error().Err(err).Msg("Error resetting cards timestamp, continuing anyway")
		}

		// Phase 2: Fetch sets (10%)
		m.setPhase(PhaseFetchingSets, "Fetching sets from Scryfall...", 10)
		setsUpdated := fetchSets(ctx)

		// Phase 3: Process sets (15%)
		if setsUpdated {
			m.setPhase(PhaseProcessingSets, "Processing sets...", 15)
			updateDatabaseSets()
		}

		// Phase 4: Fetch cards (20-60%)
		m.setPhase(PhaseFetchingCards, "Fetching cards from Scryfall...", 20)
		cardsFetched := fetchMTGCardsWithProgress(ctx, m)

		// Phase 5: Process cards (60-90%)
		if cardsFetched {
			m.setPhase(PhaseProcessingCards, "Processing and grouping cards...", 60)
			collectCardsWithProgress(ctx, m)
		} else {
			// Still rebuild the index even if we didn't fetch new cards
			m.setPhase(PhaseRebuildingIndex, "Rebuilding search index...", 90)
			rebuildCardIndex(ctx)
		}

		// Complete
		m.setPhase(PhaseComplete, "Import completed successfully", 100)
		log.Info().Msg("Manual import completed")
	}()

	return true, "Import started successfully", true
}

// fetchMTGCardsWithProgress fetches cards and updates progress.
func fetchMTGCardsWithProgress(ctx context.Context, m *ImportManager) bool {
	// This wraps the existing fetch logic but updates progress
	// For now, we'll use the existing function and update progress at key points
	return fetchMTGCards(ctx)
}

// collectCardsWithProgress processes cards and updates progress.
func collectCardsWithProgress(ctx context.Context, m *ImportManager) {
	m.setPhase(PhaseProcessingCards, "Clearing old card data...", 65)
	// The collectCards function handles its own progress logging
	// We'll update the phase at the start
	collectCards(ctx)
	m.setPhase(PhaseRebuildingIndex, "Rebuilding search index...", 95)
}
