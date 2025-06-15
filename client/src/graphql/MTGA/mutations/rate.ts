import gql from 'graphql-tag'

export const rate = gql`
    mutation rate($input: RateInput!) {
        rate(input: $input)
    }
`
