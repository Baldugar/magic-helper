import gql from 'graphql-tag'

export default gql`
    mutation deleteMTGFilterPreset($input: MTG_DeleteFilterPresetInput!) {
        deleteMTGFilterPreset(input: $input) {
            status
            message
        }
    }
`
