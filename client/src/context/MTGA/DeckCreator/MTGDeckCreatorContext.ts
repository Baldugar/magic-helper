import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTG_Card, MTG_CardPackage, MTG_Deck, MTG_DeckCard, Position } from '../../../graphql/types'

type MTGDeckCreatorContextType = {
    // Deck & Cards
    deck: MTG_Deck | undefined
    setDeck: Dispatch<SetStateAction<MTG_Deck | undefined>>
    onAddCard: (
        card: MTG_Card,
        position?: Position,
        whatDeck?: MTG_Deck,
        selectedVersionID?: string,
    ) => MTG_Deck | undefined
    addOne: (deckCard: MTG_DeckCard) => void
    removeOne: (deckCard: MTG_DeckCard) => void
    removeCard: (card: MTG_Card) => void
    setCardVersion: (cardID: string, versionID: string) => void

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

    // Import Card Package Dialog
    openImportCardPackageDialog: boolean
    setOpenImportCardPackageDialog: Dispatch<SetStateAction<boolean>>
    importCardPackage: (cardPackage: MTG_CardPackage) => void
    // Sticky CardsGrid
    stickyCardsGrid: boolean
    setStickyCardsGrid: Dispatch<SetStateAction<boolean>>
}

export const MTGDeckCreatorContext = createContext<MTGDeckCreatorContextType>({
    // Deck & Cards
    deck: undefined,
    setDeck: () => {},
    onAddCard: () => undefined,
    addOne: () => {},
    removeOne: () => {},
    removeCard: () => {},
    setCardVersion: () => {},
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

    // Import Card Package Dialog
    openImportCardPackageDialog: false,
    setOpenImportCardPackageDialog: () => {},
    importCardPackage: () => {},
    // Sticky CardsGrid
    stickyCardsGrid: true,
    setStickyCardsGrid: () => {},
})
