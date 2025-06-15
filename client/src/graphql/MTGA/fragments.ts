import gql from 'graphql-tag'

export const MTG_CardFragments = gql`
    fragment MTG_ImageFragment on MTG_Image {
        artCrop
        borderCrop
        large
        normal
        small
        PNG
    }

    fragment MTG_CardFaceFragment on MTG_CardFace {
        imageUris {
            ...MTG_ImageFragment
        }
        artist
        oracleText
        power
        toughness
        typeLine
        CMC
        colorIndicator
        colors
        flavorText
        layout
        manaCost
        name
    }

    fragment MTG_CardVersionFragment on MTG_CardVersion {
        ID
        imageUris {
            ...MTG_ImageFragment
        }
        rarity
        releasedAt
        reprint
        setName
        setType
        set
        setID
        variation
        variationOf
        isDefault
        isAlchemy
        artist
        lang
        flavorName
        flavorText
        legalities
        games
        cardFaces {
            ...MTG_CardFaceFragment
        }
    }

    fragment MTG_CardFragment on MTG_Card {
        colorIdentity
        ID
        name
        oracleText
        power
        producedMana
        toughness
        typeLine
        versions {
            ...MTG_CardVersionFragment
        }
        layout
        CMC
        colorIdentity
        colorIndicator
        colors
        EDHRecRank
        keywords
        loyalty
        manaCost
        aggregatedRating {
            ...AggregatedRatingFragment
        }
        myRating {
            ...UserRatingFragment
        }
        cardTags {
            ...CardTagFragment
        }
        deckTags {
            ...DeckTagFragment
        }
        ratings {
            ...UserRatingFragment
        }
    }
`

export const MTG_TagFragments = gql`
    fragment AggregatedRatingFragment on AggregatedRating {
        average
        count
    }

    fragment UserRatingFragment on UserRating {
        user {
            ID
        }
        value
    }

    fragment CardTagFragment on CardTag {
        ID
        name
        description
        aggregatedRating {
            ...AggregatedRatingFragment
        }
        myRating {
            ...UserRatingFragment
        }
        ratings {
            ...UserRatingFragment
        }
    }

    fragment DeckTagFragment on DeckTag {
        ID
        name
        description
        colors
        aggregatedRating {
            ...AggregatedRatingFragment
        }
        myRating {
            ...UserRatingFragment
        }
        ratings {
            ...UserRatingFragment
        }
    }
`

export const MTG_DeckFragments = gql`
    fragment PositionFragment on Position {
        x
        y
    }

    fragment MTG_DeckFragment on MTG_Deck {
        ID
        name
        cardFrontImage {
            ID
            versions {
                ID
                imageUris {
                    ...MTG_ImageFragment
                }
                cardFaces {
                    layout
                    imageUris {
                        ...MTG_ImageFragment
                    }
                }
            }
        }
        cards {
            card {
                ...MTG_CardFragment
            }
            selectedVersionID
            count
            mainOrSide
            deckCardType
            position {
                ...PositionFragment
            }
            phantoms {
                ID
                position {
                    ...PositionFragment
                }
            }
        }
        zones {
            ID
            name
            position {
                ...PositionFragment
            }
            width
            height
            childrenIDs
        }
        ignoredCards
    }
    ${MTG_CardFragments}
`

export const MTG_CardPackageFragments = gql`
    fragment MTG_CardPackageFragment on MTG_CardPackage {
        ID
        name
        cards {
            card {
                ...MTG_CardFragment
            }
            selectedVersionID
            count
            mainOrSide
        }
    }
    ${MTG_CardFragments}
`
