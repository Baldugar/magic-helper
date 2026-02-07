import gql from 'graphql-tag'

export const MTG_ImageFragments = gql`
    fragment MTG_ImageFragment on MTG_Image {
        artCrop
        borderCrop
        large
        normal
        small
        PNG
    }
`

export const MTG_CardFragments = gql`
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
        printedName
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
        tagAssignments {
            tag { ID name meta }
            chain { ID name meta }
            chainDisplay
        }
    }
    ${MTG_ImageFragments}
`

export const MTG_DeckFragments = gql`
    fragment PositionFragment on Position {
        x
        y
    }

    fragment MTG_DeckFragment on MTG_Deck {
        ID
        name
        type
        autosave
        cardFrontImage {
            cardID
            versionID
            image {
                ...MTG_ImageFragment
            }
        }
        cards {
            card {
                ...MTG_CardFragment
            }
            selectedVersionID
            count
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
            cardChildren
            zoneChildren
        }
        ignoredCards
    }
    ${MTG_CardFragments}
`
