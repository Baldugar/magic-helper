import gql from 'graphql-tag'
import { MTG_TagFragments } from '../fragments'

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
        cardTags {
            ...CardTagFragment
        }
        deckTags {
            ...DeckTagFragment
        }
    }
    ${MTG_TagFragments}
`
