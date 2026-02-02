import { Add } from '@mui/icons-material'
import { Box } from '@mui/material'
import {
    Background,
    BackgroundVariant,
    ControlButton,
    Controls,
    MiniMap,
    NodeTypes,
    ReactFlow,
    useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo } from 'react'
import { useMTGDeckCreatorLogic } from '../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { CardNode } from './Nodes/CardNode'
import { ZoneNode } from './Nodes/ZoneNode'

const nodeTypes: NodeTypes = {
    cardNode: CardNode,
    zoneNode: ZoneNode,
}

export const FlowCanvas = () => {
    const {
        readOnly,
        handleNodeDragStart,
        handlePaneClick,
        handleNodeDragStop,
        handleNodesChange,
        onAddZone,
    } = useMTGDeckFlowCreator()
    const { deck } = useMTGDeckCreatorLogic()
    const { getNodes, setNodes } = useReactFlow<NodeType>()

    const nodes = useMemo(() => {
        if (!deck) return []
        return organizeNodes(deck, getNodes)
    }, [deck, getNodes])

    useEffect(() => {
        if (!deck) return
        setNodes(organizeNodes(deck, getNodes))
        // Intentionally omit getNodes from deps: we only want to rebuild nodes when deck changes.
        // If getNodes were in deps it would run every render (new ref) and overwrite extent/expandParent set by ZoneNode.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deck, setNodes])

    if (!deck) return null

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <ReactFlow<NodeType>
                nodeTypes={nodeTypes}
                defaultNodes={nodes}
                onNodeDragStart={handleNodeDragStart}
                onNodeDragStop={handleNodeDragStop}
                onPaneClick={handlePaneClick}
                onNodesChange={handleNodesChange}
                fitView
                minZoom={0.1}
                maxZoom={4}
                zoomOnPinch
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
            >
                <Background variant={BackgroundVariant.Lines} />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.type === 'zoneNode') return '#1976d2' // blue
                        if (node.type === 'cardNode') return '#43a047' // green
                        if (node.type === 'phantomNode') return '#ff9800' // orange
                        return '#888'
                    }}
                />
                <Controls position={'bottom-left'} orientation={'vertical'} showInteractive={false} showZoom>
                    <ControlButton
                        onClick={() => {
                            onAddZone('New Zone')
                        }}
                    >
                        <Add />
                    </ControlButton>
                </Controls>
            </ReactFlow>
        </Box>
    )
}
