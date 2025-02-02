import gql from 'graphql-tag'
import { MTGA_DeckFragments } from '../fragments'

export default gql`
    mutation updateMTGADeck($input: MTGA_UpdateDeckInput!) {
        saveMTGADeckAsCopy(input: $input) {
            ...MTGA_DeckFragment
        }
    }
    ${MTGA_DeckFragments}
`
