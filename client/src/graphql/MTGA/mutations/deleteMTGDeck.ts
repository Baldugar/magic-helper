import gql from 'graphql-tag'

export default gql`
    mutation deleteMTGDeck($input: MTG_DeleteDeckInput!) {
        deleteMTGDeck(input: $input)
    }
`
