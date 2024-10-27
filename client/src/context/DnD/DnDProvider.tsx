import { DragEvent, ReactNode, useState } from 'react'
import { MTGA_Card } from '../../graphql/types'
import { DnDContext } from './DnDContext'

export const DndProvider = ({ children }: { children: ReactNode }) => {
    const [type, setType] = useState<string | null>(null)
    const [card, setCard] = useState<MTGA_Card | null>(null)

    const onDragStart = (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: 'catalogue' | 'board' | 'both',
        card?: MTGA_Card,
    ) => {
        if (viewMode === 'catalogue') return
        setType(nodeType)
        if (card) {
            setCard(card)
        }
        event.dataTransfer.effectAllowed = 'move'
    }

    const onDragEnd = () => {
        setType(null)
        setCard(null)
    }

    return <DnDContext.Provider value={{ type, card, onDragStart, onDragEnd }}>{children}</DnDContext.Provider>
}
