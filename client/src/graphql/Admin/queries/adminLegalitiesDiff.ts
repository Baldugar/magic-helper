import gql from 'graphql-tag'

export const ADMIN_LEGALITIES_DIFF_QUERY = gql`
    query adminLegalitiesDiff($importId: ID!) {
        adminLegalitiesDiff(importId: $importId) {
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
`
