import gql from 'graphql-tag'

export default gql`
    mutation unassignTagFromCard($input: MTG_UnassignTagFromCardInput!) {
        unassignTagFromCard(input: $input) {
            status
            message
        }
    }
`
