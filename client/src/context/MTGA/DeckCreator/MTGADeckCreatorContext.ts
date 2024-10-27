import { Node } from '@xyflow/react'
import { createContext, Dispatch, SetStateAction } from 'react'
import { MTGA_Card, MTGA_Deck, MTGA_DeckCard, Position } from '../../../graphql/types'
import { GroupNodeData } from '../../../views/FlowView/Nodes/GroupNode'

type MTGADeckCreatorContextType = {
    // Deck & Cards
    deck: MTGA_Deck | undefined
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

    // Flow Functions
    onAddCard: (card: MTGA_Card, position?: Position) => MTGA_DeckCard | undefined
    updateDeckCardPosition: (node: Node) => void
    updateZonePosition: (node: Node<GroupNodeData>) => void
}

export const MTGADeckCreatorContext = createContext<MTGADeckCreatorContextType>({
    // Deck & Cards
    deck: undefined,
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

    // Flow Functions
    onAddCard: () => undefined,
    updateDeckCardPosition: () => {},
    updateZonePosition: () => {},
})
