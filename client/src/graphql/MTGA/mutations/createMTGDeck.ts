import gql from 'graphql-tag'

export default gql`
    mutation createMTGDeck($input: MTG_CreateDeckInput!) {
        createMTGDeck(input: $input) {
            ID
            name
        }
    }
`
