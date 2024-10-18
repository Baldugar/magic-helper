import gql from 'graphql-tag'
import { MTGA_DeckFragments } from '../fragments'

export default gql`
    mutation createMTGADeck($input: MTGA_CreateDeckInput!) {
        createMTGADeck(input: $input) {
            ...MTGA_DeckFragment
        }
    }
    ${MTGA_DeckFragments}
`
