import { MTG_Card, MTG_CardVersion, MTG_Deck, MTG_DeckCard, MTG_Image, MTG_Layout } from '../../graphql/types'

export const getCorrectCardImage = (
    card: MTG_CardVersion,
    layout: MTG_Layout,
    size: keyof MTG_Image,
    other?: boolean,
) => {
    switch (layout) {
        case MTG_Layout.normal:
        case MTG_Layout.class:
        case MTG_Layout.saga:
        case MTG_Layout.split:
        case MTG_Layout.adventure:
        case MTG_Layout.prototype:
        case MTG_Layout.mutate:
        case MTG_Layout.meld:
        case MTG_Layout.case:
        case MTG_Layout.token:
        case MTG_Layout.emblem:
        case MTG_Layout.art_series:
        case MTG_Layout.host:
        case MTG_Layout.augment:
        case MTG_Layout.vanguard:
        case MTG_Layout.scheme:
        case MTG_Layout.planar:
        case MTG_Layout.battle:
        case MTG_Layout.flip: {
            const cardFaces = card.cardFaces
            if (!cardFaces) return other ? undefined : card.imageUris![size]
            return cardFaces[other ? 1 : 0].imageUris![size]
        }
        case MTG_Layout.modal_dfc:
        case MTG_Layout.transform:
        case MTG_Layout.double_faced_token:
        case MTG_Layout.reversible_card:
            return card.cardFaces![other ? 1 : 0].imageUris![size]
        default:
            return undefined
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
