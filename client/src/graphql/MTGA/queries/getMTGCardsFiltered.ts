import gql from 'graphql-tag'
import { MTG_CardFragments } from '../fragments'

export default gql`
    query getMTGCardsFiltered(
        $filter: MTG_Filter_SearchInput!
        $pagination: MTG_Filter_PaginationInput!
        $sort: [MTG_Filter_SortInput!]!
    ) {
        getMTGCardsFiltered(filter: $filter, pagination: $pagination, sort: $sort) {
            pagedCards {
                ...MTG_CardFragment
            }
            totalCount
        }
    }
    ${MTG_CardFragments}
`
