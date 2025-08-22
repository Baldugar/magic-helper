import gql from 'graphql-tag'

export default gql`
    mutation createMTGCardPackage($input: MTG_CreateCardPackageInput!) {
        createMTGCardPackage(input: $input) {
            status
            message
        }
    }
`
