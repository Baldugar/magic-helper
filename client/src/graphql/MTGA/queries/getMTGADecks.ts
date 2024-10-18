import gql from 'graphql-tag'
import { MTGA_DeckFragments } from '../fragments'

export default gql`
    query getMTGADecks($deckID: ID) {
        getMTGADecks(deckID: $deckID) {
            ...MTGA_DeckFragment
        }
    }
    ${MTGA_DeckFragments}
`
