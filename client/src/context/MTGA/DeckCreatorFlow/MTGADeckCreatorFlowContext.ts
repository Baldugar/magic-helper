import { OnNodeDrag, OnNodesChange } from '@xyflow/react'
import { createContext, Dispatch, DragEventHandler, SetStateAction } from 'react'
import { NodeType } from '../../../utils/functions/nodeFunctions'

type MTGADeckCreatorFlowContextType = {
    nodes: NodeType[]
    onDrop: DragEventHandler<HTMLDivElement>
    onDragOver: DragEventHandler<HTMLDivElement>
    handleNodeDragStop: OnNodeDrag<NodeType>
    onNodesChange: OnNodesChange<NodeType>
    setNodes: Dispatch<SetStateAction<NodeType[]>>
    handleDeleteZone: (nodeID: string, deleteNodes: boolean) => void
    handleRenameZone: (nodeID: string, newName: string) => void
    handleDeletePhantom: (cardID: string, phantomIndex: number) => void
}

export const MTGADeckCreatorFlowContext = createContext<MTGADeckCreatorFlowContextType>({
    handleDeleteZone: () => {},
    handleRenameZone: () => {},
    handleNodeDragStop: () => {},
    nodes: [],
    onDragOver: () => {},
    onDrop: () => {},
    onNodesChange: () => {},
    setNodes: () => {},
    handleDeletePhantom: () => {},
})
