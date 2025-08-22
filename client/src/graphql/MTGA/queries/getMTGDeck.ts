import gql from 'graphql-tag'
import { MTG_DeckFragments } from '../fragments'

export default gql`
    query getMTGDeck($deckID: ID!) {
        getMTGDeck(deckID: $deckID) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
`
