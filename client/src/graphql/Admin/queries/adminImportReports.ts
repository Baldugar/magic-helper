import gql from 'graphql-tag'

export const ADMIN_IMPORT_REPORTS_QUERY = gql`
    query adminImportReports($job: AdminJob!, $limit: Int) {
        adminImportReports(job: $job, limit: $limit) {
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
    }
`
