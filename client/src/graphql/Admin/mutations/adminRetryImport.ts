import gql from 'graphql-tag'

export const ADMIN_RETRY_IMPORT_MUTATION = gql`
    mutation adminRetryImport($input: AdminImportActionInput!) {
        adminRetryImport(input: $input) {
            status
            message
        }
    }
`
