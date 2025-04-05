import { MTG_Card, MTG_Deck, MTG_DeckCard, MTG_Image } from '../../graphql/types'

export const getCorrectCardImage = (card: MTG_Card, size: keyof MTG_Image, other?: boolean) => {
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

export const matchesCommanderColorIdentity = (card: MTG_DeckCard, commander?: MTG_DeckCard) => {
    if (
        !commander ||
        card.card.colorIdentity.length === 0 ||
        (card.card.colorIdentity.length === 1 && card.card.colorIdentity[0] === 'C')
    )
        return true
    return card.card.colorIdentity.every((color) => commander.card.colorIdentity.includes(color))
}

export const isCardInDeck = (card: MTG_Card, deck: MTG_Deck | undefined) => {
    if (!deck) return false
    return deck.cards.some((deckCard) => deckCard.card.ID === card.ID)
}
