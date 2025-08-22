import gql from 'graphql-tag'

export const unassignTag = gql`
    mutation unassignTag($input: UnassignTagInput!) {
        unassignTag(input: $input) {
            status
            message
        }
    }
`
