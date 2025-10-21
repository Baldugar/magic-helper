import { ReactNode, useState } from 'react'
import { DeckCreatorView } from '../../../../types/deckCreatorView'
import { MTGDeckCreatorUIContext } from './MTGDeckCreatorUIContext'

export const MTGDeckCreatorUIProvider = ({ children }: { children: ReactNode }) => {
    const [openDrawer, setOpenDrawer] = useState(false)
    const [viewMode, setViewMode] = useState<DeckCreatorView>('CATALOGUE')
    const [openImportDialog, setOpenImportDialog] = useState(false)
    const [openExportDialog, setOpenExportDialog] = useState(false)
    // Sticky CardsGrid
    const [stickyCardsGrid, setStickyCardsGrid] = useState(true)

    const [openedCardDialog, setOpenedCardDialog] = useState<string | null>(null)

    return (
        <MTGDeckCreatorUIContext.Provider
            value={{
                openDrawer,
                setOpenDrawer,
                setViewMode,
                viewMode,
                openImportDialog,
                setOpenImportDialog,
                openExportDialog,
                setOpenExportDialog,
                // Sticky CardsGrid
                stickyCardsGrid,
                setStickyCardsGrid,
                // Opened Card Dialog
                openedCardDialog,
                setOpenedCardDialog,
            }}
        >
            {children}
        </MTGDeckCreatorUIContext.Provider>
    )
}
