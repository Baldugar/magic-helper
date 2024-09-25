import gql from 'graphql-tag'
import { MTGA_Fragments } from '../fragments/MTGACard'

export default gql`
    query getMTGACards {
        getMTGACards {
            ...MTGA_CardFragment
        }
    }
    ${MTGA_Fragments}
`
