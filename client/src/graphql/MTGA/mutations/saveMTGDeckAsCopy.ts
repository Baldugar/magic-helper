import gql from 'graphql-tag'
import { MTG_DeckFragments } from '../fragments'

export default gql`
    mutation updateMTGDeck($input: MTG_UpdateDeckInput!) {
        saveMTGDeckAsCopy(input: $input) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
`
