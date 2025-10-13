import {
    MTG_Card,
    MTG_CardVersion,
    MTG_CardVersion_Dashboard,
    MTG_Deck,
    MTG_DeckCard,
    MTG_Image,
} from '../../graphql/types'

export const getCorrectCardImage = (
    card: MTG_CardVersion | MTG_CardVersion_Dashboard | MTG_Image,
    size: keyof MTG_Image,
    other?: boolean,
) => {
    if (size in card) {
        return card[size as keyof typeof card]
    }
    const cardFaces = 'cardFaces' in card ? card.cardFaces : []
    if (!cardFaces || cardFaces.length === 0) {
        return other ? undefined : 'imageUris' in card ? card.imageUris![size] : undefined
    }
    if (other && cardFaces.length > 1) {
        if (cardFaces[1].imageUris) {
            return cardFaces[1].imageUris![size]
        }
        if (cardFaces[0].imageUris) {
            return cardFaces[0].imageUris![size]
        }
        return 'imageUris' in card ? card.imageUris![size] : undefined
    }
    if (cardFaces[0].imageUris) {
        return cardFaces[0].imageUris![size]
    }
    return 'imageUris' in card ? card.imageUris![size] : undefined
}

export const getCorrectVersionImage = (card: MTG_CardVersion, size: keyof MTG_Image) => {
    const cardFaces = card.cardFaces
    if (!cardFaces || !cardFaces[0].imageUris) return card.imageUris![size]
    return cardFaces[0].imageUris![size]
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
