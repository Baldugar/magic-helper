import gql from 'graphql-tag'

export default gql`
    mutation deleteMTGADeck($input: MTGA_DeleteDeckInput!) {
        deleteMTGADeck(input: $input)
    }
`
