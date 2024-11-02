import { Node, OnNodesChange } from '@xyflow/react'
import { createContext, Dispatch, SetStateAction } from 'react'

type MTGADeckCreatorFlowContextType = {
    // Nodes
    nodes: Node[]
    setNodes: Dispatch<SetStateAction<Node[]>>
    onNodesChange: OnNodesChange<Node>
}

export const MTGADeckCreatorFlowContext = createContext<MTGADeckCreatorFlowContextType>({
    // Nodes
    nodes: [],
    setNodes: () => {},
    onNodesChange: () => {},
})
