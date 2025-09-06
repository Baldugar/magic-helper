import gql from 'graphql-tag'

export default gql`
    mutation editMTGCardPackageName($input: MTG_EditCardPackageNameInput!) {
        editMTGCardPackageName(input: $input) {
            status
            message
        }
    }
`
