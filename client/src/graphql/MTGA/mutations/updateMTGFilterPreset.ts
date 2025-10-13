import gql from 'graphql-tag'

export default gql`
    mutation updateMTGFilterPreset($input: MTG_UpdateFilterPresetInput!) {
        updateMTGFilterPreset(input: $input) {
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
