import gql from 'graphql-tag'

export default gql`
    query getMTGAFilters {
        getMTGAFilters {
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
        }
    }
`
