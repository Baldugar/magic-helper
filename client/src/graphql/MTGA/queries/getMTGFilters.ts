import gql from 'graphql-tag'

export default gql`
    query getMTGFilters($list: MTG_CardListType!) {
        getMTGFilters(list: $list) {
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
