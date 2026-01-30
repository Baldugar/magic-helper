import { NodeChange, OnNodeDrag } from '@xyflow/react'
import { createContext, Dispatch, SetStateAction } from 'react'
import { NodeType } from '../../../utils/functions/nodeFunctions'

type MTGDeckCreatorFlowContextType = {
    draggingZoneIDs: string[]
    setDraggingZoneIDs: (ids: string[]) => void
    temporarilyUnlockedZoneIDs: string[]
    readOnly: boolean
    setReadOnly: Dispatch<SetStateAction<boolean>>
    isDirty: boolean
    setIsDirty: Dispatch<SetStateAction<boolean>>
    onAddZone: (name: string) => void
    handleNodeDragStart: OnNodeDrag<NodeType>
    handlePaneClick: (event: React.MouseEvent) => void
    handleNodeDragStop: OnNodeDrag<NodeType>
    handleNodesChange: (changes: NodeChange<NodeType>[]) => void
}

export const MTGDeckCreatorFlowContext = createContext<MTGDeckCreatorFlowContextType>({
    draggingZoneIDs: [],
    setDraggingZoneIDs: () => {},
    temporarilyUnlockedZoneIDs: [],
    readOnly: false,
    setReadOnly: () => {},
    isDirty: false,
    setIsDirty: () => {},
    onAddZone: () => {},
    handleNodeDragStart: () => {},
    handlePaneClick: () => {},
    handleNodeDragStop: () => {},
    handleNodesChange: () => {},
})
