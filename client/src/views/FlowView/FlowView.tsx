import {
    Background,
    BackgroundVariant,
    MiniMap,
    Node,
    NodeTypes,
    Panel,
    ReactFlow,
    useNodesState,
    useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DragEventHandler, useCallback, useState } from 'react'
import { useDnD } from '../../context/DnD/useDnD'
import { uuidv4 } from '../../utils/functions/IDFunctions'
import { onNodeDragStop, sortNodesByNesting } from '../../utils/functions/nodeFunctions'
import { CardNode } from './Nodes/CardNode'
import { GroupNode } from './Nodes/GroupNode'
import { ResizeRotateNode } from './Nodes/ResizeRotateNode'

const initialNodes: Node[] = [
    {
        id: 'group_1',
        position: {
            x: 100,
            y: 100,
        },
        type: 'groupNode',
        data: {
            label: 'Group 1',
            childrenIDs: [],
        },
        style: { width: 200, height: 200 },
    },
    {
        id: 'group_2',
        position: {
            x: -100,
            y: -100,
        },
        type: 'groupNode',
        data: {
            label: 'Group 2',
            childrenIDs: [],
        },
        style: { width: 200, height: 200 },
    },
    {
        id: '3',
        position: { x: 0, y: 0 },
        data: { label: '3' },
    },
]

const nodeTypes: NodeTypes = {
    resizeRotate: ResizeRotateNode,
    groupNode: GroupNode,
    cardNode: CardNode,
}

export const FlowView = () => {
    const { getIntersectingNodes, screenToFlowPosition } = useReactFlow()
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [openDrawer, setOpenDrawer] = useState(false)
    const { type, setType, card, setCard } = useDnD()
    // const { cards } = useMTGACards()
    // const [currentPage, setCurrentPage] = useState(1)
    // const PAGE_SIZE = 10

    const onDragOver: DragEventHandler<HTMLDivElement> = useCallback((event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop: DragEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            event.preventDefault()
            // check if the dropped element is valid
            if (!type) {
                return
            }

            // project was renamed to screenToFlowPosition
            // and you don't need to subtract the reactFlowBounds.left/top anymore
            // details: https://reactflow.dev/whats-new/2023-11-10
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            })
            const newNode = {
                id: uuidv4(),
                type,
                position,
                data: { label: `${type} node`, card, childrenIDs: [] },
            }

            setNodes((nds) => sortNodesByNesting(nds.concat(newNode)))
        },
        [screenToFlowPosition, type, setNodes, card],
    )

    // const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string, card?: MTGA_Card) => {
    //     setType(nodeType)
    //     if (card) {
    //         setCard(card)
    //     }
    //     event.dataTransfer.effectAllowed = 'move'
    // }

    return (
        <>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                onNodeDragStop={(_, node) => onNodeDragStop(node, getIntersectingNodes, nodes, setNodes)}
                onNodesChange={onNodesChange}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
            >
                <Panel position="top-right">
                    <button onClick={() => setOpenDrawer(!openDrawer)}>Open Drawer</button>
                </Panel>
                <Background variant={BackgroundVariant.Lines} />
                <MiniMap />
            </ReactFlow>
            {/* <Drawer anchor={'right'} variant={'persistent'} open={openDrawer} onClose={() => setOpenDrawer(false)}>
                <Box sx={{ maxWidth: 500, pt: '15px' }}>
                    <button onClick={() => setOpenDrawer(!openDrawer)}>Open Drawer</button>
                    <Box my={2}>
                        <Box
                            width={1}
                            height={'50px'}
                            sx={{ outline: '1px dashed black', cursor: 'grab' }}
                            display={'flex'}
                            justifyContent={'center'}
                            alignItems={'center'}
                            bgcolor={'lightgray'}
                            onDragStart={(event) => onDragStart(event, 'groupNode')}
                            draggable
                        >
                            New group
                        </Box>
                    </Box>
                    <Grid container spacing={2} mt={1}>
                        {cards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((card) => (
                            <Grid item xs={6} key={card.ID}>
                                <Box
                                    display={'flex'}
                                    justifyContent={'center'}
                                    onDragStart={(event) => onDragStart(event, 'cardNode', card)}
                                    sx={{ cursor: 'grab' }}
                                    draggable
                                >
                                    <img src={getCorrectCardImage(card, 'small')} alt={card.name} width={200} />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                        <Pagination
                            count={Math.ceil(cards.length / PAGE_SIZE)}
                            page={currentPage}
                            onChange={(_, page) => setCurrentPage(page)}
                        />
                    </Box>
                </Box>
            </Drawer> */}
        </>
    )
}
