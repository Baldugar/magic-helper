import { Button } from '@mui/material'
import { Background, BackgroundVariant, MiniMap, Node, NodeTypes, Panel, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { uuidv4 } from '../../utils/functions/IDFunctions'
import { sortNodesByNesting } from '../../utils/functions/nodeFunctions'
import { CardNode } from './Nodes/CardNode'
import { GroupNode, GroupNodeData } from './Nodes/GroupNode'
import { PhantomNode } from './Nodes/PhantomNode'
import { useFlowViewState } from './useFlowViewState'

const nodeTypes: NodeTypes = {
    groupNode: GroupNode,
    cardNode: CardNode,
    phantomNode: PhantomNode,
}

export const FlowView = () => {
    const { handleNodeDragStop, nodes, onDragOver, onDrop, onNodesChange, setNodes } = useFlowViewState()

    return (
        <>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                onNodeDragStop={handleNodeDragStop}
                onNodesChange={onNodesChange}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
                minZoom={0.1}
            >
                <Panel position={'bottom-left'}>
                    <Button
                        variant={'contained'}
                        onClick={() => {
                            const name = prompt('Enter the name of the zone')
                            if (name) {
                                const newNode = {
                                    id: uuidv4(),
                                    type: 'groupNode',
                                    position: { x: 0, y: 0 },
                                    data: { label: name, childrenIDs: [] },
                                } as Node<GroupNodeData>
                                setNodes((nds) => sortNodesByNesting(nds.concat(newNode)))
                            }
                        }}
                    >
                        Create Zone
                    </Button>
                </Panel>
                <Background variant={BackgroundVariant.Lines} />
                <MiniMap />
            </ReactFlow>
        </>
    )
}
