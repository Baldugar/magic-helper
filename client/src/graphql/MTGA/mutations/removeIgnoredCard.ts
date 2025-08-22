import gql from 'graphql-tag'

export default gql`
    mutation removeIgnoredCard($input: RemoveIgnoredCardInput!) {
        removeIgnoredCard(input: $input) {
            status
            message
        }
    }
`
