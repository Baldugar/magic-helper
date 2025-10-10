import gql from 'graphql-tag'

export default gql`
    mutation createMTGFilterPreset($input: MTG_CreateFilterPresetInput!) {
        createMTGFilterPreset(input: $input) {
            ID
            deckID
            ownerID
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
