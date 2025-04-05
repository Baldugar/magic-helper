import gql from 'graphql-tag'
import { MTG_DeckFragments } from '../fragments'

export default gql`
    mutation createMTGDeck($input: MTG_CreateDeckInput!) {
        createMTGDeck(input: $input) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
`
