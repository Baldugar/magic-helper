import gql from 'graphql-tag'
import { MTG_DeckFragments, MTG_TagFragments } from '../fragments'

export default gql`
    mutation updateMTGDeck($input: MTG_UpdateDeckInput!) {
        saveMTGDeckAsCopy(input: $input) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
    ${MTG_TagFragments}
`
