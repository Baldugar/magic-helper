import gql from 'graphql-tag'
import { MTG_DeckFragments } from '../fragments'

export default gql`
    query getMTGDecks($deckID: ID) {
        getMTGDecks(deckID: $deckID) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
`
