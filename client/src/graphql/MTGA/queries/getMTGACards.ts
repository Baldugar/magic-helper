import gql from 'graphql-tag'
import { MTGA_CardFragments } from '../fragments'

export default gql`
    query getMTGACards {
        getMTGACards {
            ...MTGA_CardFragment
        }
    }
    ${MTGA_CardFragments}
`
