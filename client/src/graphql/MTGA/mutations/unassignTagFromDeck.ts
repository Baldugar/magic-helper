import gql from 'graphql-tag'

export default gql`
    mutation unassignTagFromDeck($input: MTG_UnassignTagFromDeckInput!) {
        unassignTagFromDeck(input: $input) {
            status
            message
        }
    }
`
