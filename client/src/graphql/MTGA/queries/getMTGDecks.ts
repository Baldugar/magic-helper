import gql from 'graphql-tag'
import { MTG_DeckFragments, MTG_TagFragments } from '../fragments'

export default gql`
    query getMTGDecks($deckID: ID) {
        getMTGDecks(deckID: $deckID) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
    ${MTG_TagFragments}
`
