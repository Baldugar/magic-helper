import { Box } from '@mui/material'
import { Background, BackgroundVariant, MiniMap, NodeTypes, OnNodeDrag, ReactFlow, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo } from 'react'
import { useMTGDeckCreatorLogic } from '../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { CardNode } from './Nodes/CardNode'

const nodeTypes: NodeTypes = {
    cardNode: CardNode,
}

export const FlowCanvas = () => {
    const { readOnly, setDraggingGroupId } = useMTGDeckFlowCreator()
    const { deck } = useMTGDeckCreatorLogic()
    const { getNodes } = useReactFlow<NodeType>()
    // Handler for drag start
    const handleNodeDragStart: OnNodeDrag<NodeType> = useCallback(
        (_, node) => {
            if (node.type === 'groupNode') {
                setDraggingGroupId(node.id)
            }
        },
        [setDraggingGroupId],
    )

    const nodes = useMemo(() => {
        if (!deck) return []
        return organizeNodes(deck, getNodes)
    }, [deck, getNodes])

    if (!deck) return null

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <ReactFlow<NodeType>
                nodeTypes={nodeTypes}
                defaultNodes={nodes}
                onNodeDragStart={handleNodeDragStart}
                fitView
                minZoom={0.1}
                maxZoom={4}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
            >
                <Background variant={BackgroundVariant.Lines} />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.type === 'groupNode') return '#1976d2' // blue
                        if (node.type === 'cardNode') return '#43a047' // green
                        if (node.type === 'phantomNode') return '#ff9800' // orange
                        return '#888'
                    }}
                />
            </ReactFlow>
        </Box>
    )
}
