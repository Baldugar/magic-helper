import { createContext, DragEvent } from 'react'
import { MTG_Card } from '../../graphql/types'

type DnDContextType = {
    type: string | null
    card: MTG_Card | null
    onDragStart: (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: 'catalogue' | 'board' | 'both',
        card?: MTG_Card,
    ) => void
    onDragEnd: () => void
}

export const DnDContext = createContext<DnDContextType>({
    type: null,
    card: null,
    onDragStart: () => {},
    onDragEnd: () => {},
})
