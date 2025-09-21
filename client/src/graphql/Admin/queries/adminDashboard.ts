import gql from 'graphql-tag'

export const ADMIN_DASHBOARD_QUERY = gql`
    query adminDashboard {
        adminDashboard {
            imports {
                jobName
                lastRun {
                    id
                    jobName
                    status
                    startedAt
                    completedAt
                    durationMs
                    recordsProcessed
                    errorMessage
                    metadata
                }
                previousRun {
                    id
                    jobName
                    status
                    startedAt
                    completedAt
                    durationMs
                    recordsProcessed
                    errorMessage
                    metadata
                }
                latency {
                    lastDurationMs
                    avgDurationMs
                    p50DurationMs
                    p90DurationMs
                    totalRuns
                    lastStartedAt
                }
            }
            latestLegalitiesDiff {
                importId
                jobName
                entries {
                    cardID
                    cardName
                    format
                    previousStatus
                    currentStatus
                    setCode
                    setName
                    changedAt
                }
            }
        }
    }
`
