import { createContext, DragEvent } from 'react'
import { FlowZone, MTG_Card, MTG_DeckCard } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'

export type DraggableItem = MTG_Card | MTG_DeckCard | FlowZone

type DnDContextType = {
    type: string | null
    item: DraggableItem | null
    onDragStart: (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: DeckCreatorView,
        item?: DraggableItem,
    ) => void
    onDragEnd: () => void
}

export const DnDContext = createContext<DnDContextType>({
    type: null,
    item: null,
    onDragStart: () => {},
    onDragEnd: () => {},
})
