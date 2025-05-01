import gql from 'graphql-tag'

export default gql`
    query getMTGFilters {
        getMTGFilters {
            types {
                cardType
                subtypes
            }
            expansions {
                set
                setName
                releasedAt
                imageURL
                setType
            }
            legality {
                formats
                legalityValues
            }
            layouts
        }
    }
`
