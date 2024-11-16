import { MTGA_Card, MTGA_DeckCard, MTGA_Image } from '../../graphql/types'

export const getCorrectCardImage = (card: MTGA_Card, size: keyof MTGA_Image, other?: boolean) => {
    switch (card.layout) {
        case 'normal':
        case 'class':
        case 'saga':
        case 'split':
        case 'adventure':
        case 'prototype':
        case 'mutate':
        case 'meld':
        case 'case':
            return other ? undefined : card.image![size]
        case 'modal_dfc':
        case 'transform':
            return card.cardFaces![other ? 1 : 0].image![size]
    }
}

export const matchesCommanderColorIdentity = (card: MTGA_DeckCard, commander?: MTGA_DeckCard) => {
    if (
        !commander ||
        card.card.colorIdentity.length === 0 ||
        (card.card.colorIdentity.length === 1 && card.card.colorIdentity[0] === 'C')
    )
        return true
    return card.card.colorIdentity.every((color) => commander.card.colorIdentity.includes(color))
}
