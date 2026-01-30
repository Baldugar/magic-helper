import gql from 'graphql-tag'

export default gql`
    query getMTGFilterPresets($deckID: ID!) {
        getMTGFilterPresets(deckID: $deckID) {
            ID
            deckID
            name
            savedAt
            page
            filterState
            sortState {
                sortBy
                sortDirection
                enabled
            }
        }
    }
`
