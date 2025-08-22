import gql from 'graphql-tag'
import { MTG_TagFragments } from '../fragments'

export const getTagQuery = gql`
    query tag($id: ID!) {
        tag(id: $id) {
            ...CardTagFragment
            ...DeckTagFragment
        }
    }
    ${MTG_TagFragments}
`
