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
            }
            legality {
                formats
                legalityValues
            }
            layouts
        }
    }
`
