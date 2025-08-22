import gql from 'graphql-tag'

export default gql`
    mutation removeMTGCardFromCardPackage($input: MTG_RemoveCardFromCardPackageInput!) {
        removeMTGCardFromCardPackage(input: $input) {
            status
            message
        }
    }
`
