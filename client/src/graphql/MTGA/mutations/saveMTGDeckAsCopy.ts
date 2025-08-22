import gql from 'graphql-tag'

export default gql`
    mutation updateMTGDeck($input: MTG_UpdateDeckInput!) {
        saveMTGDeckAsCopy(input: $input) {
            status
            message
        }
    }
`
