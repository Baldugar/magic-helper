import gql from 'graphql-tag'
import { MTG_TagFragments } from '../fragments'

export const getTagsQuery = gql`
    query tags {
        tags {
            ...CardTagFragment
            ...DeckTagFragment
        }
    }
    ${MTG_TagFragments}
`
