import { createContext, Dispatch, SetStateAction } from 'react'
import { DeckType, MTG_Card, MTG_Deck, MTG_DeckCard, Position } from '../../../../graphql/types'

type MTGDeckCreatorLogicContextType = {
    // Deck & Cards
    deck: MTG_Deck
    setDeck: Dispatch<SetStateAction<MTG_Deck>>
    onAddCard: (card: MTG_Card, position?: Position, selectedVersionID?: string) => MTG_Deck
    addOne: (deckCard: MTG_DeckCard) => void
    removeOne: (deckCard: MTG_DeckCard) => void
    removeCard: (card: MTG_Card) => void
    setCardVersion: (cardID: string, versionID: string) => void
}

export const MTGDeckCreatorLogicContext = createContext<MTGDeckCreatorLogicContextType>({
    // Deck & Cards
    deck: {
        cards: [],
        ignoredCards: [],
        name: '',
        type: DeckType.UNKNOWN,
        zones: [],
        ID: '',
        tags: [],
        autosave: false,
    },
    setDeck: () => {},
    onAddCard: () => ({
        cards: [],
        ignoredCards: [],
        name: '',
        type: DeckType.UNKNOWN,
        zones: [],
        ID: '',
        tags: [],
        autosave: false,
    }),
    addOne: () => {},
    removeOne: () => {},
    removeCard: () => {},
    setCardVersion: () => {},
})
