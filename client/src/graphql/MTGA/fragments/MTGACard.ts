import gql from 'graphql-tag'

export const MTGA_Fragments = gql`
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
    }
`
