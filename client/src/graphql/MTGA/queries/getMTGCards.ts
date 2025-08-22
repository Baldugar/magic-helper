import gql from 'graphql-tag'
import { MTG_CardFragments } from '../fragments'

export default gql`
    query getMTGCards {
        getMTGCards {
            ...MTG_CardFragment
        }
    }
    ${MTG_CardFragments}
`
