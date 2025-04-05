import gql from 'graphql-tag'

export const MTG_CardFragments = gql`
    fragment MTG_CommonFieldsFragment on MTG_CommonFields {
        colors
        flavorText
        image {
            small
            normal
            large
            png
            artCrop
            borderCrop
        }
        loyalty
        name
        power
        producedMana
        toughness
        typeLine
    }

    fragment MTG_CardFragment on MTG_Card {
        ...MTG_CommonFieldsFragment
        colorIdentity
        cmc
        cardFaces {
            ...MTG_CommonFieldsFragment
            manaCost
            description
        }
        setName
        set
        ID
        rarity
        manaCost
        description
        layout
        legalities
        releasedAt
        scryfallURL
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
        cardFrontImage
        cards {
            card {
                ...MTG_CardFragment
            }
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
        type
        ignoredCards
    }
    ${MTG_CardFragments}
`
