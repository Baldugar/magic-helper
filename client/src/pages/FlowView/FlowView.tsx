import { Button } from '@mui/material'
import { Background, BackgroundVariant, MiniMap, Node, NodeTypes, Panel, ReactFlow, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMTGDeckCreator } from '../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckFlowCreator } from '../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { uuidv4 } from '../../utils/functions/IDFunctions'
import { NodeType, organizeNodes, sortNodesByNesting } from '../../utils/functions/nodeFunctions'
import { CardNode } from './Nodes/CardNode'
import { GroupNode, GroupNodeData, MIN_SIZE } from './Nodes/GroupNode'
import { PhantomNode } from './Nodes/PhantomNode'

const nodeTypes: NodeTypes = {
    groupNode: GroupNode,
    cardNode: CardNode,
    phantomNode: PhantomNode,
}

export const FlowView = () => {
    const { handleNodeDragStop, onDragOver, onDrop, handleDeleteZone, handleRenameZone, handleDeletePhantom } =
        useMTGDeckFlowCreator()
    const { deck } = useMTGDeckCreator()
    const { setNodes, getNodes } = useReactFlow<NodeType>()

    if (!deck) return null

    const nodes = organizeNodes(deck, handleDeleteZone, handleRenameZone, handleDeletePhantom)

    const handleCreateZone = () => {
        const name = prompt('Enter the name of the zone')
        if (name) {
            const nodes = getNodes()
            const newNode = {
                id: uuidv4(),
                type: 'groupNode',
                position: { x: 0, y: 0 },
                data: {
                    label: name,
                    childrenIDs: [],
                    onDelete: handleDeleteZone,
                    onNameChange: handleRenameZone,
                },
                width: MIN_SIZE,
                height: MIN_SIZE,
            } as Node<GroupNodeData>
            const newNodes = sortNodesByNesting(nodes.concat(newNode))
            setNodes(newNodes)
        }
    }

    return (
        <>
            <ReactFlow<NodeType>
                nodeTypes={nodeTypes}
                defaultNodes={nodes}
                onNodeDragStop={handleNodeDragStop}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
                minZoom={0.1}
                maxZoom={4}
            >
                <Panel position={'bottom-left'}>
                    <Button variant={'contained'} onClick={handleCreateZone}>
                        Create Zone
                    </Button>
                </Panel>
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
        </>
    )
}
