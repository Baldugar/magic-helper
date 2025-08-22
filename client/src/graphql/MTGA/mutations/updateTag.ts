import gql from 'graphql-tag'

export const updateTag = gql`
    mutation updateTag($input: UpdateTagInput!) {
        updateTag(input: $input) {
            status
            message
        }
    }
`
