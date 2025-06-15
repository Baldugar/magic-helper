import gql from 'graphql-tag'

export const createTag = gql`
    mutation createTag($input: CreateTagInput!) {
        createTag(input: $input)
    }
`
