import gql from 'graphql-tag'

export const deleteTag = gql`
    mutation deleteTag($tagID: ID!) {
        deleteTag(tagID: $tagID)
    }
`
