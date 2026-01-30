import gql from 'graphql-tag'

export default gql`
    mutation deleteMTGTag($input: MTG_DeleteTagInput!) {
        deleteMTGTag(input: $input) {
            status
            message
        }
    }
`
