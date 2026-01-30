import gql from 'graphql-tag'

export default gql`
    mutation assignTagToCard($input: MTG_AssignTagToCardInput!) {
        assignTagToCard(input: $input) {
            status
            message
        }
    }
`
