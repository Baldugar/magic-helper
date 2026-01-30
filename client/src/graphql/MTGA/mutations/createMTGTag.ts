import gql from 'graphql-tag'

export default gql`
    mutation createMTGTag($input: MTG_CreateTagInput!) {
        createMTGTag(input: $input) {
            ID
            name
        }
    }
`
