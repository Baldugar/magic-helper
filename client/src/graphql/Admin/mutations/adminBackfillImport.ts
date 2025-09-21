import gql from 'graphql-tag'

export const ADMIN_BACKFILL_IMPORT_MUTATION = gql`
    mutation adminBackfillImport($input: AdminImportActionInput!) {
        adminBackfillImport(input: $input) {
            status
            message
        }
    }
`
