import { createContext, Dispatch, SetStateAction } from 'react'
import { DeckCreatorView } from '../../../../types/deckCreatorView'

type MTGDeckCreatorUIContextType = {
    // Views & Drawer
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

    // Sticky CardsGrid
    stickyCardsGrid: boolean
    setStickyCardsGrid: Dispatch<SetStateAction<boolean>>

    // Opened Card Dialog
    openedCardDialog: string | null
    setOpenedCardDialog: Dispatch<SetStateAction<string | null>>

    // Catalogue context menu open (disables scroll-to-change-page in CardsGrid)
    catalogueContextMenuOpen: boolean
    setCatalogueContextMenuOpen: Dispatch<SetStateAction<boolean>>
}

export const MTGDeckCreatorUIContext = createContext<MTGDeckCreatorUIContextType>({
    // Views & Drawer
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

    // Sticky CardsGrid
    stickyCardsGrid: true,
    setStickyCardsGrid: () => {},

    // Opened Card Dialog
    openedCardDialog: null,
    setOpenedCardDialog: () => {},

    catalogueContextMenuOpen: false,
    setCatalogueContextMenuOpen: () => {},
})
