import { createContext, DragEvent } from 'react'
import { MTGA_Card } from '../../graphql/types'

type DnDContextType = {
    type: string | null
    card: MTGA_Card | null
    onDragStart: (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: 'catalogue' | 'board' | 'both',
        card?: MTGA_Card,
    ) => void
    onDragEnd: () => void
}

export const DnDContext = createContext<DnDContextType>({
    type: null,
    card: null,
    onDragStart: () => {},
    onDragEnd: () => {},
})
