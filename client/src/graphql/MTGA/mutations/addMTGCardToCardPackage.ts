import gql from 'graphql-tag'

export default gql`
    mutation addMTGCardToCardPackage($input: MTG_AddCardToCardPackageInput!) {
        addMTGCardToCardPackage(input: $input) {
            status
            message
        }
    }
`
