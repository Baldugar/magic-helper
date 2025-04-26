import gql from 'graphql-tag'

export default gql`
    mutation deleteMTGCardPackage($input: MTG_DeleteCardPackageInput!) {
        deleteMTGCardPackage(input: $input)
    }
`
