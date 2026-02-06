import gql from 'graphql-tag'

export default gql`
    query getMTGImportStatus {
        getMTGImportStatus {
            started
            message
            inProgress
            phase
            progress
            startedAt
            completedAt
            error
        }
    }
`
