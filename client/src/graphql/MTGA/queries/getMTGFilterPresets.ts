import gql from 'graphql-tag'

export default gql`
    query getMTGFilterPresets($deckID: ID!) {
        getMTGFilterPresets(deckID: $deckID) {
            ID
            deckID
            name
            savedAt
            page
            filter
            sort {
                sortBy
                sortDirection
                enabled
            }
        }
    }
`
