import { createContext, Dispatch, SetStateAction } from 'react'
import { MTGA_Card, MTGA_Deck, MTGA_DeckCard, Position } from '../../../graphql/types'

type MTGADeckCreatorContextType = {
    // Deck & Cards
    deck: MTGA_Deck | undefined
    setDeck: Dispatch<SetStateAction<MTGA_Deck | undefined>>
    onAddCard: (card: MTGA_Card, position?: Position) => MTGA_Deck | undefined
    addOne: (deckCard: MTGA_DeckCard) => void
    removeOne: (deckCard: MTGA_DeckCard) => void
    removeCard: (deckCard: MTGA_DeckCard) => void

    // Views & Drawer
    deckTab: 'main' | 'side'
    setDeckTab: Dispatch<SetStateAction<'main' | 'side'>>
    openDrawer: boolean
    setOpenDrawer: Dispatch<SetStateAction<boolean>>
    selectingCommander: boolean
    setSelectingCommander: Dispatch<SetStateAction<boolean>>
    viewMode: 'catalogue' | 'board' | 'both'
    setViewMode: Dispatch<SetStateAction<'catalogue' | 'board' | 'both'>>
}

export const MTGADeckCreatorContext = createContext<MTGADeckCreatorContextType>({
    // Deck & Cards
    deck: undefined,
    setDeck: () => {},
    onAddCard: () => undefined,
    addOne: () => {},
    removeOne: () => {},
    removeCard: () => {},

    // Views & Drawer
    deckTab: 'main',
    setDeckTab: () => {},
    openDrawer: false,
    setOpenDrawer: () => {},
    selectingCommander: false,
    setSelectingCommander: () => {},
    viewMode: 'catalogue',
    setViewMode: () => {},
})
