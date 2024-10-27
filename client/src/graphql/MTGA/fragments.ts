import gql from 'graphql-tag'

export const MTGA_CardFragments = gql`
    fragment MTGA_CommonFieldsFragment on MTGA_CommonFields {
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

    fragment MTGA_CardFragment on MTGA_Card {
        ...MTGA_CommonFieldsFragment
        colorIdentity
        cmc
        cardFaces {
            ...MTGA_CommonFieldsFragment
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
    }
`

export const MTGA_DeckFragments = gql`
    fragment PositionFragment on Position {
        x
        y
        parentID
    }

    fragment MTGA_DeckFragment on MTGA_Deck {
        ID
        name
        cardFrontImage
        cards {
            card {
                ...MTGA_CardFragment
            }
            count
            mainOrSide
            deckCardType
            position {
                ...PositionFragment
            }
            phantoms {
                ...PositionFragment
            }
        }
        zones {
            ID
            name
            position {
                ...PositionFragment
            }
        }
        type
    }
    ${MTGA_CardFragments}
`
