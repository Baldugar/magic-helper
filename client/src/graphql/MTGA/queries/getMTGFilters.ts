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
                games
            }
            legality {
                formats
                legalityValues
            }
            layouts
        }
    }
`
