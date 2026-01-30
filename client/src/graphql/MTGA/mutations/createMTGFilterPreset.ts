import gql from 'graphql-tag'

export default gql`
    mutation createMTGFilterPreset($input: MTG_CreateFilterPresetInput!) {
        createMTGFilterPreset(input: $input) {
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
