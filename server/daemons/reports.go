package daemons

import (
	"context"

	"magic-helper/arango"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/rs/zerolog/log"
)

// importReportBuilder helps daemons capture metrics and persist import reports.
type importReportBuilder struct {
	report    model.MTGImportReport
	metadata  map[string]any
	finalized bool
}

// newImportReportBuilder initializes a report with job name and start timestamp.
func newImportReportBuilder(jobName string) *importReportBuilder {
	return &importReportBuilder{
		report: model.MTGImportReport{
			ID:        util.UUID4(),
			JobName:   jobName,
			StartedAt: util.Now(),
			Status:    model.ImportReportStatusRunning,
		},
		metadata: make(map[string]any),
	}
}

// AddMetadata attaches arbitrary metrics for later inspection in admin views.
func (b *importReportBuilder) AddMetadata(key string, value any) {
	if b == nil {
		return
	}
	if b.metadata == nil {
		b.metadata = make(map[string]any)
	}
	b.metadata[key] = value
}

// SetRecordsProcessed stores the number of entities touched by the job.
func (b *importReportBuilder) SetRecordsProcessed(count int) {
	if b == nil {
		return
	}
	b.report.RecordsProcessed = count
}

// MarkFailed updates the report status, preserving the first error message.
func (b *importReportBuilder) MarkFailed(err error) {
	if b == nil || err == nil {
		return
	}
	if b.report.Status == model.ImportReportStatusFailed {
		return
	}
	b.report.Status = model.ImportReportStatusFailed
	msg := err.Error()
	b.report.ErrorMessage = &msg
}

// MarkSkipped records that the job skipped execution and captures a reason.
func (b *importReportBuilder) MarkSkipped(reason string) {
	if b == nil {
		return
	}
	if b.report.Status == model.ImportReportStatusFailed {
		return
	}
	b.report.Status = model.ImportReportStatusSkipped
	if reason != "" {
		b.AddMetadata("skip_reason", reason)
	}
}

// Complete finalizes timestamps, infers success, and persists the report.
func (b *importReportBuilder) Complete(ctx context.Context) {
	if b == nil || b.finalized {
		return
	}
	b.finalized = true

	completedAt := util.Now()
	b.report.CompletedAt = &completedAt

	duration := completedAt - b.report.StartedAt
	b.report.DurationMs = &duration

	if len(b.metadata) > 0 {
		b.report.Metadata = b.metadata
	} else {
		b.report.Metadata = nil
	}

	if b.report.Status == model.ImportReportStatusRunning {
		b.report.Status = model.ImportReportStatusSuccess
	}

	if _, exists := b.metadata["skip_reason"]; exists && b.report.Status == model.ImportReportStatusSuccess {
		b.report.Status = model.ImportReportStatusSkipped
	}

	if err := persistImportReport(ctx, b.report); err != nil {
		log.Error().Err(err).Str("job", b.report.JobName).Msg("Failed to persist import report")
	}
}

// persistImportReport writes the report to the MTG import reports collection.
func persistImportReport(ctx context.Context, report model.MTGImportReport) error {
	col, err := arango.EnsureDocumentCollection(ctx, arango.MTG_IMPORT_REPORTS_COLLECTION)
	if err != nil {
		return err
	}

	_, err = col.CreateDocument(ctx, report)
	return err
}
