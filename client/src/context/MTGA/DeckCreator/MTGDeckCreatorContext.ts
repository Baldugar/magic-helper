import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTG_Card, MTG_CardPackage, MTG_Deck, MTG_DeckCard, Position } from '../../../graphql/types'
import { DeckCreatorView } from '../../../types/deckCreatorView'

type MTGDeckCreatorContextType = {
    // Deck & Cards
    deck: MTG_Deck
    setDeck: Dispatch<SetStateAction<MTG_Deck>>
    onAddCard: (card: MTG_Card, position?: Position, selectedVersionID?: string) => MTG_Deck
    addOne: (deckCard: MTG_DeckCard) => void
    removeOne: (deckCard: MTG_DeckCard) => void
    removeCard: (card: MTG_Card) => void
    setCardVersion: (cardID: string, versionID: string) => void

    // Views & Drawer
    deckTab: MainOrSide
    setDeckTab: Dispatch<SetStateAction<MainOrSide>>
    openDrawer: boolean
    setOpenDrawer: Dispatch<SetStateAction<boolean>>
    viewMode: DeckCreatorView
    setViewMode: Dispatch<SetStateAction<DeckCreatorView>>

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

    // Opened Card Dialog
    openedCardDialog: string | null
    setOpenedCardDialog: Dispatch<SetStateAction<string | null>>
}

export const MTGDeckCreatorContext = createContext<MTGDeckCreatorContextType>({
    // Deck & Cards
    deck: {
        cards: [],
        ignoredCards: [],
        name: '',
        zones: [],
        ID: '',
    },
    setDeck: () => {},
    onAddCard: () => ({
        cards: [],
        ignoredCards: [],
        name: '',
        zones: [],
        ID: '',
    }),
    addOne: () => {},
    removeOne: () => {},
    removeCard: () => {},
    setCardVersion: () => {},
    // Views & Drawer
    deckTab: MainOrSide.MAIN,
    setDeckTab: () => {},
    openDrawer: false,
    setOpenDrawer: () => {},
    viewMode: 'CATALOGUE',
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

    // Opened Card Dialog
    openedCardDialog: null,
    setOpenedCardDialog: () => {},
})
