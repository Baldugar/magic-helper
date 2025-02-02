import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTGA_Card, MTGA_Deck, MTGA_DeckCard, Position } from '../../../graphql/types'

type MTGADeckCreatorContextType = {
    // Deck & Cards
    deck: MTGA_Deck | undefined
    setDeck: Dispatch<SetStateAction<MTGA_Deck | undefined>>
    onAddCard: (card: MTGA_Card, position?: Position) => MTGA_Deck | undefined
    addOne: (deckCard: MTGA_DeckCard) => void
    removeOne: (deckCard: MTGA_DeckCard) => void
    removeCard: (card: MTGA_Card) => void

    // Views & Drawer
    deckTab: MainOrSide
    setDeckTab: Dispatch<SetStateAction<MainOrSide>>
    openDrawer: boolean
    setOpenDrawer: Dispatch<SetStateAction<boolean>>
    selectingCommander: boolean
    setSelectingCommander: Dispatch<SetStateAction<boolean>>
    viewMode: 'catalogue' | 'board' | 'both'
    setViewMode: Dispatch<SetStateAction<'catalogue' | 'board' | 'both'>>

    // Import Dialog
    openImportDialog: boolean
    setOpenImportDialog: Dispatch<SetStateAction<boolean>>

    // Export Dialog
    openExportDialog: boolean
    setOpenExportDialog: Dispatch<SetStateAction<boolean>>
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
    deckTab: MainOrSide.MAIN,
    setDeckTab: () => {},
    openDrawer: false,
    setOpenDrawer: () => {},
    selectingCommander: false,
    setSelectingCommander: () => {},
    viewMode: 'catalogue',
    setViewMode: () => {},

    // Import Dialog
    openImportDialog: false,
    setOpenImportDialog: () => {},

    // Export Dialog
    openExportDialog: false,
    setOpenExportDialog: () => {},
})
