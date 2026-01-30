import gql from 'graphql-tag'

export default gql`
    mutation assignTagToDeck($input: MTG_AssignTagToDeckInput!) {
        assignTagToDeck(input: $input) {
            status
            message
        }
    }
`
