import gql from 'graphql-tag'
import { MTG_CardFragments } from '../fragments'

export const getTagQuery = gql`
    query tag($id: ID!) {
        tag(id: $id) {
            ...CardTagFragment
            ...DeckTagFragment
        }
    }
    ${MTG_CardFragments}
`
