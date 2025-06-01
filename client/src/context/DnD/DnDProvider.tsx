import { DragEvent, ReactNode, useState } from 'react'
import { DeckCreatorView } from '../../types/deckCreatorView'
import { DnDContext, DraggableItem } from './DnDContext'

export const DndProvider = ({ children }: { children: ReactNode }) => {
    const [type, setType] = useState<string | null>(null)
    const [item, setItem] = useState<DraggableItem | null>(null)

    const onDragStart = (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: DeckCreatorView,
        item?: DraggableItem,
    ) => {
        if (viewMode === 'CATALOGUE') return
        setType(nodeType)
        if (item) {
            setItem(item)
        }
        event.dataTransfer.effectAllowed = 'move'
    }

    const onDragEnd = () => {
        setType(null)
        setItem(null)
    }

    return <DnDContext.Provider value={{ type, item, onDragStart, onDragEnd }}>{children}</DnDContext.Provider>
}
