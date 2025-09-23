import gql from 'graphql-tag'

export default gql`
    mutation editMTGCardPackageVisibility($input: MTG_EditCardPackageVisibilityInput!) {
        editMTGCardPackageVisibility(input: $input) {
            status
            message
        }
    }
`
