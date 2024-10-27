import { Button } from '@mui/material'
import {
    Background,
    BackgroundVariant,
    MiniMap,
    Node,
    NodeTypes,
    OnNodeDrag,
    OnNodesChange,
    Panel,
    ReactFlow,
    useNodesState,
    useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DragEventHandler, MutableRefObject, useCallback, useEffect } from 'react'
import { useDnD } from '../../context/DnD/useDnD'
import { useMTGADeckCreator } from '../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { uuidv4 } from '../../utils/functions/IDFunctions'
import { onNodeDragStop, sortNodesByNesting } from '../../utils/functions/nodeFunctions'
import { organizeNodes } from './functions'
import { CardNode, CardNodeData } from './Nodes/CardNode'
import { GroupNode, GroupNodeData } from './Nodes/GroupNode'
import { PhantomNode, PhantomNodeData } from './Nodes/PhantomNode'
import { ResizeRotateNode } from './Nodes/ResizeRotateNode'

const nodeTypes: NodeTypes = {
    resizeRotate: ResizeRotateNode,
    groupNode: GroupNode,
    cardNode: CardNode,
    phantomNode: PhantomNode,
}

export type FlowViewProps = {
    nodesRef: MutableRefObject<Node[]>
}

export const FlowView = (props: FlowViewProps) => {
    const { nodesRef } = props

    const { card, type } = useDnD()
    const { deck, updateDeckCardPosition, updateZonePosition, onAddCard } = useMTGADeckCreator()

    const [nodes, setNodes, onNodesChange] = useNodesState(organizeNodes(deck))
    const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()

    const handleNodesChange: OnNodesChange<Node> = (changes) => {
        console.log('nodes changed:', changes)
        onNodesChange(changes)
    }

    useEffect(() => {
        if (deck) {
            setNodes(organizeNodes(deck))
        }
    }, [deck, setNodes])

    useEffect(() => {
        nodesRef.current = nodes
    }, [nodes, nodesRef])

    const onDragOver: DragEventHandler<HTMLDivElement> = useCallback((event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    // This function is called when a card is dropped on the flow view and should add a new node to the flow, then call the onAddCard function to add the card to the deck
    const onDrop: DragEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            event.preventDefault()
            // check if the dropped element is valid
            if (!type || !card) {
                return
            }

            // project was renamed to screenToFlowPosition
            // and you don't need to subtract the reactFlowBounds.left/top anymore
            // details: https://reactflow.dev/whats-new/2023-11-10
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            })
            let newNode: Node<CardNodeData> | Node<GroupNodeData> | Node<PhantomNodeData> | null = null
            if (type === 'groupNode') {
                newNode = {
                    id: uuidv4(),
                    type: type,
                    position,
                    data: { label: `${type} node`, childrenIDs: [] },
                } as Node<GroupNodeData>
                updateZonePosition(newNode)
                return
            }

            const deckCard = onAddCard(card, position)

            const cardID = card.ID
            const idx = nodes.findIndex((n) => n.id === cardID)
            // If the card is already in the deck, add a phantom
            if (idx !== -1) {
                const idx = nodes.filter((n) => n.id !== cardID && n.id.startsWith(cardID)).length
                newNode = {
                    data: {
                        card,
                        index: idx,
                        phantomOf: cardID,
                        position,
                    },
                    id: cardID + '_phantom_' + idx,
                    position,
                    type: 'phantomNode',
                } as Node<PhantomNodeData>
                return
            } else {
                newNode = {
                    id: cardID,
                    type: 'cardNode',
                    position,
                    data: { label: card.name, card: deckCard },
                } as Node<CardNodeData>
            }

            setNodes((nds) => sortNodesByNesting(nds.concat(newNode)))
        },
        [screenToFlowPosition, type, setNodes, card, onAddCard, nodes, updateZonePosition],
    )

    const handleNodeDragStop: OnNodeDrag<Node> = (_, node) => {
        onNodeDragStop(node, getIntersectingNodes, nodes, setNodes)
        if (node.type === 'cardNode' || node.type === 'phantomNode') updateDeckCardPosition(node)
        else if (node.type === 'groupNode') updateZonePosition(node as Node<GroupNodeData>)
    }

    return (
        <>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                onNodeDragStop={handleNodeDragStop}
                onNodesChange={handleNodesChange}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
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
                                updateZonePosition(newNode)
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
