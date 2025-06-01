import { createContext, DragEvent } from 'react'
import { MTG_Card } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'

type DnDContextType = {
    type: string | null
    card: MTG_Card | null
    onDragStart: (
        event: DragEvent<HTMLDivElement>,
        nodeType: string,
        viewMode: DeckCreatorView,
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
