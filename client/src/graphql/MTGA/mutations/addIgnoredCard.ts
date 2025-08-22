import gql from 'graphql-tag'

export default gql`
    mutation addIgnoredCard($input: AddIgnoredCardInput!) {
        addIgnoredCard(input: $input) {
            status
            message
        }
    }
`
