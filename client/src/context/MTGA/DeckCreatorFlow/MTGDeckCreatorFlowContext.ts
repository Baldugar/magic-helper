import { OnNodeDrag } from '@xyflow/react'
import { createContext, DragEventHandler, Dispatch, SetStateAction } from 'react'
import { MTG_Card, MTG_DeckCard, Position } from '../../../graphql/types'
import { NodeType } from '../../../utils/functions/nodeFunctions'

type MTGDeckCreatorFlowContextType = {
    onDrop: DragEventHandler<HTMLDivElement>
    onDragOver: DragEventHandler<HTMLDivElement>
    handleNodeDragStop: OnNodeDrag<NodeType>
    handleDeleteZone: (nodeID: string, deleteNodes: boolean) => void
    handleRenameZone: (nodeID: string, newName: string) => void
    handleDeletePhantom: (id: string) => void
    onAddCard: (card: MTG_Card, position?: Position) => MTG_DeckCard | undefined
    draggingGroupId: string | null
    setDraggingGroupId: (id: string | null) => void
    readOnly: boolean
    setReadOnly: Dispatch<SetStateAction<boolean>>
    moveMode: boolean
    setMoveMode: Dispatch<SetStateAction<boolean>>
}

export const MTGDeckCreatorFlowContext = createContext<MTGDeckCreatorFlowContextType>({
    handleDeleteZone: () => {},
    handleRenameZone: () => {},
    handleNodeDragStop: () => {},
    onDragOver: () => {},
    onDrop: () => {},
    handleDeletePhantom: () => {},
    onAddCard: () => undefined,
    draggingGroupId: null,
    setDraggingGroupId: () => {},
    readOnly: false,
    setReadOnly: () => {},
    moveMode: false,
    setMoveMode: () => {},
})
