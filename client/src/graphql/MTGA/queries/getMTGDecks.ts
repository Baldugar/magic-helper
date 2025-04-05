import gql from 'graphql-tag'
import { MTG_DeckFragments } from '../fragments'

export default gql`
    query getMTGDecks($deckID: ID, $list: MTG_CardListType!) {
        getMTGDecks(deckID: $deckID, list: $list) {
            ...MTG_DeckFragment
        }
    }
    ${MTG_DeckFragments}
`
