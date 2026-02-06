import gql from 'graphql-tag'

export default gql`
    query getMTGTag($tagID: ID!) {
        getMTGTag(tagID: $tagID) {
            ID
            name
            meta
        }
    }
`
