import { DragEvent, ReactNode, useState } from 'react'
import { MTG_Card } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'
import { DnDContext } from './DnDContext'

export const DndProvider = ({ children }: { children: ReactNode }) => {
    const [type, setType] = useState<string | null>(null)
    const [card, setCard] = useState<MTG_Card | null>(null)

    const onDragStart = (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: DeckCreatorView,
        card?: MTG_Card,
    ) => {
        if (viewMode === 'CATALOGUE') return
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
