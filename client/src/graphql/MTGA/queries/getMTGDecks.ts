import gql from 'graphql-tag'
import { MTG_ImageFragments } from '../fragments'

export default gql`
    query getMTGDecks {
        getMTGDecks {
            ID
            name
            cardFrontImage {
                cardID
                versionID
                image {
                    ...MTG_ImageFragment
                }
            }
            cards {
                selectedVersionID
                card {
                    ID
                    versions {
                        ID
                        cardFaces {
                            imageUris {
                                ...MTG_ImageFragment
                            }
                        }
                        imageUris {
                            ...MTG_ImageFragment
                        }
                        isDefault
                        isAlchemy
                    }
                }
            }
        }
    }
    ${MTG_ImageFragments}
`
