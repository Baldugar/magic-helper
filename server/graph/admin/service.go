package admin

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"

	"magic-helper/arango"
	"magic-helper/graph/model"
)

var jobToInternal = map[model.AdminJob]string{
	model.AdminJobMtgCards: "MTG_cards",
	model.AdminJobMtgSets:  "MTG_sets",
}

var adminJobs = []model.AdminJob{
	model.AdminJobMtgCards,
	model.AdminJobMtgSets,
}

func internalToJobName(internal string) (model.AdminJob, error) {
	for job, name := range jobToInternal {
		if name == internal {
			return job, nil
		}
	}
	return "", fmt.Errorf("unknown job name %q", internal)
}

func jobToStatus(status model.MTGImportReportStatus) (model.AdminImportStatus, error) {
	switch status {
	case model.ImportReportStatusRunning:
		return model.AdminImportStatusRunning, nil
	case model.ImportReportStatusSuccess:
		return model.AdminImportStatusSuccess, nil
	case model.ImportReportStatusFailed:
		return model.AdminImportStatusFailed, nil
	case model.ImportReportStatusSkipped:
		return model.AdminImportStatusSkipped, nil
	default:
		return "", fmt.Errorf("unknown import status %q", status)
	}
}

func jobToInternalName(job model.AdminJob) (string, error) {
	name, ok := jobToInternal[job]
	if !ok {
		return "", fmt.Errorf("unsupported job %s", job)
	}
	return name, nil
}

func FetchImportReports(ctx context.Context, job model.AdminJob, limit int) ([]*model.AdminImportReport, error) {
	if limit <= 0 {
		limit = 25
	}

	internal, err := jobToInternalName(job)
	if err != nil {
		return nil, err
	}

	aq := arango.NewQuery(`
        FOR report IN MTG_Import_Reports
            FILTER report.job_name == @job
            SORT report.started_at DESC
            LIMIT @limit
            RETURN report
    `)
	aq = aq.AddBindVar("job", internal)
	aq = aq.AddBindVar("limit", limit)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	reports := make([]*model.AdminImportReport, 0, limit)
	for cursor.HasMore() {
		var raw model.MTGImportReport
		if _, err := cursor.ReadDocument(ctx, &raw); err != nil {
			return nil, err
		}
		converted, err := convertReport(raw)
		if err != nil {
			return nil, err
		}
		reports = append(reports, converted)
	}

	return reports, nil
}

func convertReport(raw model.MTGImportReport) (*model.AdminImportReport, error) {
	job, err := internalToJobName(raw.JobName)
	if err != nil {
		return nil, err
	}
	status, err := jobToStatus(raw.Status)
	if err != nil {
		return nil, err
	}

	report := &model.AdminImportReport{
		ID:        raw.ID,
		JobName:   job,
		Status:    status,
		StartedAt: raw.StartedAt,
		Metadata:  raw.Metadata,
	}

	if raw.CompletedAt != nil {
		report.CompletedAt = raw.CompletedAt
	}
	if raw.DurationMs != nil {
		report.DurationMs = raw.DurationMs
	}
	if raw.ErrorMessage != nil {
		report.ErrorMessage = raw.ErrorMessage
	}
	rp := raw.RecordsProcessed
	report.RecordsProcessed = &rp

	return report, nil
}

func BuildSummary(ctx context.Context, job model.AdminJob) (*model.AdminImportSummary, error) {
	reports, err := FetchImportReports(ctx, job, 20)
	if err != nil {
		return nil, err
	}
	summary := &model.AdminImportSummary{
		JobName: job,
		Latency: buildLatencyMetrics(reports),
	}
	if len(reports) > 0 {
		summary.LastRun = reports[0]
	}
	if len(reports) > 1 {
		summary.PreviousRun = reports[1]
	}
	return summary, nil
}

func buildLatencyMetrics(reports []*model.AdminImportReport) *model.AdminLatencyMetrics {
	metrics := &model.AdminLatencyMetrics{TotalRuns: len(reports)}
	if len(reports) == 0 {
		return metrics
	}
	if reports[0].DurationMs != nil {
		metrics.LastDurationMs = reports[0].DurationMs
	}
	lastStarted := reports[0].StartedAt
	metrics.LastStartedAt = &lastStarted

	durations := make([]int, 0, len(reports))
	for _, report := range reports {
		if report.DurationMs != nil {
			durations = append(durations, *report.DurationMs)
		}
	}
	if len(durations) == 0 {
		return metrics
	}

	sum := 0
	for _, d := range durations {
		sum += d
	}
	avg := sum / len(durations)
	metrics.AvgDurationMs = &avg

	sort.Ints(durations)
	metrics.P50DurationMs = percentilePointer(durations, 0.5)
	metrics.P90DurationMs = percentilePointer(durations, 0.9)

	return metrics
}

func percentilePointer(values []int, quantile float64) *int {
	if len(values) == 0 {
		return nil
	}
	if quantile <= 0 {
		v := values[0]
		return &v
	}
	if quantile >= 1 {
		v := values[len(values)-1]
		return &v
	}
	position := quantile * float64(len(values)-1)
	lower := int(math.Floor(position))
	upper := int(math.Ceil(position))
	if lower == upper {
		v := values[lower]
		return &v
	}
	weight := position - float64(lower)
	interpolated := int(math.Round((1-weight)*float64(values[lower]) + weight*float64(values[upper])))
	return &interpolated
}

func Dashboard(ctx context.Context) (*model.AdminDashboard, error) {
	summaries := make([]*model.AdminImportSummary, 0, len(adminJobs))
	for _, job := range adminJobs {
		summary, err := BuildSummary(ctx, job)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}

	latestDiff, err := LatestLegalitiesDiff(ctx)
	if err != nil && !errors.Is(err, ErrNoLegalitiesDiff) {
		return nil, err
	}

	dashboard := &model.AdminDashboard{Imports: summaries}
	if err == nil {
		dashboard.LatestLegalitiesDiff = latestDiff
	}
	return dashboard, nil
}

var ErrNoLegalitiesDiff = errors.New("no legality diff found")

func LatestLegalitiesDiff(ctx context.Context) (*model.AdminLegalitiesDiff, error) {
	aq := arango.NewQuery(`
        FOR diff IN MTG_Legality_Diffs
            COLLECT importID = diff.import_id, jobName = diff.job_name
            AGGREGATE latestChange = MAX(diff.changed_at)
            SORT latestChange DESC
            LIMIT 1
            RETURN { importId: importID, jobName: jobName }
    `)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		return nil, ErrNoLegalitiesDiff
	}

	var row struct {
		ImportID string `json:"importId"`
		JobName  string `json:"jobName"`
	}
	if _, err := cursor.ReadDocument(ctx, &row); err != nil {
		return nil, err
	}

	return FetchLegalitiesDiff(ctx, row.ImportID, row.JobName)
}

func FetchLegalitiesDiff(ctx context.Context, importID string, jobName string) (*model.AdminLegalitiesDiff, error) {
	if importID == "" {
		return nil, ErrNoLegalitiesDiff
	}
	if jobName == "" {
		return nil, fmt.Errorf("jobName must not be empty")
	}

	job, err := internalToJobName(jobName)
	if err != nil {
		return nil, err
	}

	aq := arango.NewQuery(`
        FOR diff IN MTG_Legality_Diffs
            FILTER diff.import_id == @importID
            SORT diff.changed_at DESC
            RETURN diff
    `)
	aq = aq.AddBindVar("importID", importID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	entries := make([]*model.AdminLegalitiesDiffEntry, 0)
	for cursor.HasMore() {
		var row model.MTGLegalitiesDiff
		if _, err := cursor.ReadDocument(ctx, &row); err != nil {
			return nil, err
		}
		entries = append(entries, &model.AdminLegalitiesDiffEntry{
			CardID:         row.CardID,
			CardName:       row.CardName,
			Format:         row.Format,
			PreviousStatus: row.PreviousStatus,
			CurrentStatus:  row.CurrentStatus,
			SetCode:        row.SetCode,
			SetName:        row.SetName,
			ChangedAt:      row.ChangedAt,
		})
	}

	if len(entries) == 0 {
		return nil, ErrNoLegalitiesDiff
	}

	return &model.AdminLegalitiesDiff{
		ImportID: importID,
		JobName:  job,
		Entries:  entries,
	}, nil
}

func LegalitiesDiffByImport(ctx context.Context, importID string) (*model.AdminLegalitiesDiff, error) {
	if importID == "" {
		return nil, ErrNoLegalitiesDiff
	}
	aq := arango.NewQuery(`
        LET doc = FIRST(
            FOR diff IN MTG_Legality_Diffs
                FILTER diff.import_id == @importID
                LIMIT 1
                RETURN diff
        )
        RETURN doc
    `)
	aq = aq.AddBindVar("importID", importID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		return nil, ErrNoLegalitiesDiff
	}

	var row model.MTGLegalitiesDiff
	if _, err := cursor.ReadDocument(ctx, &row); err != nil {
		return nil, err
	}

	return FetchLegalitiesDiff(ctx, row.ImportID, row.JobName)
}
