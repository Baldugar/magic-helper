import gql from 'graphql-tag'

export default gql`
    mutation updateMTGTag($input: MTG_UpdateTagInput!) {
        updateMTGTag(input: $input) {
            ID
            name
            meta
        }
    }
`
