import { OnNodeDrag } from '@xyflow/react'
import { createContext, DragEventHandler } from 'react'
import { NodeType } from '../../../utils/functions/nodeFunctions'

type MTGADeckCreatorFlowContextType = {
    onDrop: DragEventHandler<HTMLDivElement>
    onDragOver: DragEventHandler<HTMLDivElement>
    handleNodeDragStop: OnNodeDrag<NodeType>
    handleDeleteZone: (nodeID: string, deleteNodes: boolean) => void
    handleRenameZone: (nodeID: string, newName: string) => void
    handleDeletePhantom: (cardID: string, phantomIndex: number) => void
}

export const MTGADeckCreatorFlowContext = createContext<MTGADeckCreatorFlowContextType>({
    handleDeleteZone: () => {},
    handleRenameZone: () => {},
    handleNodeDragStop: () => {},
    onDragOver: () => {},
    onDrop: () => {},
    handleDeletePhantom: () => {},
})
