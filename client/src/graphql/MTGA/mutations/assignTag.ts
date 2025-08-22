import gql from 'graphql-tag'

export const assignTag = gql`
    mutation assignTag($input: AssignTagInput!) {
        assignTag(input: $input) {
            status
            message
        }
    }
`
