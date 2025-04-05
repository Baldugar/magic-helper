import gql from 'graphql-tag'
import { MTG_CardFragments } from '../fragments'

export default gql`
    query getMTGCards($list: MTG_CardListType!) {
        getMTGCards(list: $list) {
            ...MTG_CardFragment
        }
    }
    ${MTG_CardFragments}
`
