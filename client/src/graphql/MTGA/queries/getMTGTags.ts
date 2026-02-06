import gql from 'graphql-tag'

export default gql`
    query getMTGTags {
        getMTGTags {
            ID
            name
            meta
        }
    }
`
