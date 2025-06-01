import { Node, OnNodeDrag, useReactFlow } from '@xyflow/react'
import { DragEventHandler, ReactNode, useState } from 'react'
import { MainOrSide, MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType, Position } from '../../../graphql/types'
import { CardNodeData } from '../../../pages/FlowView/Nodes/CardNode'
import { GroupNodeData, MIN_SIZE } from '../../../pages/FlowView/Nodes/GroupNode'
import { PhantomNodeData } from '../../../pages/FlowView/Nodes/PhantomNode'
import { singleSetSelected } from '../../../utils/functions/filterFunctions'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import {
    findNextAvailablePosition,
    NodeType,
    onNodeDragStop,
    sortNodesByNesting,
} from '../../../utils/functions/nodeFunctions'
import { useDnD } from '../../DnD/useDnD'
import { useMTGDeckCreator } from '../DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGDeckCreatorFlowContext } from './MTGDeckCreatorFlowContext'

export const MTGDeckCreatorFlowProvider = ({ children, deck }: { children: ReactNode; deck: MTG_Deck }) => {
    const { item, type } = useDnD()
    const { selectingCommander, setSelectingCommander, deckTab, setDeck, removeCard } = useMTGDeckCreator()
    const { screenToFlowPosition, getIntersectingNodes, setNodes, getNodes } = useReactFlow<NodeType>()

    const { filter } = useMTGFilter()
    const set = singleSetSelected(filter)

    const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)

    // Zone Functions
    const handleDeleteZone = (nodeID: string, deleteNodes: boolean) => {
        setNodes((nodes) => {
            const node = nodes.find((n) => n.id === nodeID)
            if (!node) return nodes
            const childrenIDs = (node.data as GroupNodeData).childrenIDs
            if (deleteNodes) {
                const { nodesToDelete, newNodes } = nodes.reduce(
                    (acc, n) => {
                        if (childrenIDs.includes(n.id) && n.id !== nodeID) {
                            acc.nodesToDelete.push(n as Node<CardNodeData | PhantomNodeData>)
                        } else {
                            acc.newNodes.push(n)
                        }
                        return acc
                    },
                    { nodesToDelete: [] as Node<CardNodeData | PhantomNodeData>[], newNodes: [] as NodeType[] },
                )
                for (const n of nodesToDelete) {
                    if (n.type === 'cardNode') {
                        removeCard((n as Node<CardNodeData>).data.card.card)
                    }
                    if (n.type === 'phantomNode') {
                        handleDeletePhantom(n.id)
                    }
                }
                return newNodes
            }
            const newNodes = nodes
                .filter((n) => {
                    return n.id !== nodeID
                })
                .map((n) => {
                    if (childrenIDs.includes(n.id)) {
                        return {
                            ...n,
                            data: { ...n.data },
                            parentId: undefined,
                            position: {
                                x: n.position.x + node.position.x,
                                y: n.position.y + node.position.y,
                            },
                        }
                    }
                    return n
                })

            return newNodes
        })
    }

    const handleRenameZone = (nodeID: string, newName: string) => {
        setNodes((nodes) => {
            const node = nodes.find((n) => n.id === nodeID)
            if (!node) return nodes
            return nodes.map((n) => {
                if (n.id === nodeID) {
                    return {
                        ...n,
                        data: { ...n.data, label: newName },
                    }
                }
                return n
            })
        })
    }

    const handleDeletePhantom = (phantomID: string) => {
        setNodes((nodes) => {
            const phantomNode = nodes.find((n) => n.id === phantomID)
            if (!phantomNode) return nodes
            return nodes
                .filter((n) => n.id !== phantomNode.id)
                .map((n) => {
                    if (
                        n.type === 'cardNode' &&
                        (phantomNode.data as PhantomNodeData).phantomOf === (n.data as CardNodeData).card.card.ID
                    ) {
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                card: {
                                    ...(n.data as CardNodeData).card,
                                    phantoms: (n.data as CardNodeData).card.phantoms.filter((p) => p.ID !== phantomID),
                                },
                            },
                        }
                    } else {
                        return n
                    }
                })
        })
    }
    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (card: MTG_Card, position?: Position): MTG_DeckCard | undefined => {
        let cardToReturn: MTG_DeckCard | undefined
        if (deck) {
            const newDeck = structuredClone(deck)
            if (selectingCommander) {
                // Remove the previous commander
                const previousCommander = newDeck.cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
                if (previousCommander) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                }
                // Add the new commander
                const setVersion = card.versions.find((v) => v.set === set)
                cardToReturn = {
                    card,
                    count: 1,
                    deckCardType: MTG_DeckCardType.COMMANDER,
                    mainOrSide: MainOrSide.MAIN,
                    position: position || { x: 0, y: 0 },
                    phantoms: [],
                    selectedVersionID: setVersion?.ID,
                }
                newDeck.cards.push(cardToReturn)
                setSelectingCommander(false)
            } else {
                const ID = card.ID
                const index = newDeck.cards.findIndex((c) => c.card.ID === ID && c.mainOrSide === deckTab)
                const nextAvailableSpot = findNextAvailablePosition(newDeck.cards)
                // If the card is already in the deck, add a phantom
                if (index !== -1) {
                    // TODO: Add +1 on count if the card is already in the deck
                    newDeck.cards[index].phantoms.push({
                        ID: uuidv4(),
                        position: position || nextAvailableSpot,
                    })
                    cardToReturn = structuredClone(newDeck.cards[index])
                } else {
                    const setVersion = card.versions.find((v) => v.set === set)
                    cardToReturn = {
                        card,
                        count: 1,
                        deckCardType: MTG_DeckCardType.NORMAL,
                        mainOrSide: deckTab,
                        position: position || nextAvailableSpot,
                        phantoms: [],
                        selectedVersionID: setVersion?.ID,
                    }
                    newDeck.cards.push(cardToReturn)
                }
            }
            setDeck(newDeck)
        }
        return cardToReturn
    }

    // This function is called when a card is dragged over the flow view
    const onDragOver: DragEventHandler<HTMLDivElement> = (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }

    // This function is called when a card is dropped on the flow view and should add a new node to the flow, then call the onAddCard function to add the card to the deck
    const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
        event.preventDefault()
        console.log('onDrop', type, item)
        // check if the dropped element is valid
        if (!type || !item) {
            return
        }

        // project was renamed to screenToFlowPosition
        // and you don't need to subtract the reactFlowBounds.left/top anymore
        // details: https://reactflow.dev/whats-new/2023-11-10
        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        })
        let newNode: NodeType | null = null
        if (type === 'groupNode') {
            const groupData: GroupNodeData = {
                label: `${type} node`,
                childrenIDs: [],
                onDelete: handleDeleteZone,
                onNameChange: handleRenameZone,
            }
            newNode = {
                id: uuidv4(),
                type: type,
                position,
                data: groupData,
                width: MIN_SIZE,
                height: MIN_SIZE,
            } as Node<GroupNodeData>
            return
        }

        if (item.__typename !== 'MTG_Card') {
            return
        }

        const deckCard = onAddCard(item, position)

        const cardID = item.ID
        const nodes = getNodes()
        const idx = nodes.findIndex((n) => n.id === cardID)
        // If the card is already in the deck, add a phantom
        if (idx !== -1) {
            if (deckCard) {
                const phantomData: PhantomNodeData = {
                    card: deckCard,
                    phantomOf: cardID,
                    position,
                    onDelete: handleDeletePhantom,
                }
                newNode = {
                    data: phantomData,
                    id: uuidv4(),
                    position,
                    type: 'phantomNode',
                } as Node<PhantomNodeData>
            }
        } else if (deckCard) {
            const cardData: CardNodeData = { card: deckCard }
            newNode = {
                id: cardID,
                type: 'cardNode',
                position,
                data: cardData,
            } as Node<CardNodeData>
        }
        if (!newNode) return
        const newNodes = sortNodesByNesting(nodes.concat(newNode))
        setNodes(newNodes)
    }

    // This function is called when a node is dragged and dropped inside the flow view
    const handleNodeDragStop: OnNodeDrag<NodeType> = (_, node) => {
        const nodes = getNodes()
        onNodeDragStop(node, getIntersectingNodes, nodes, setNodes)
    }

    return (
        <MTGDeckCreatorFlowContext.Provider
            value={{
                onDrop,
                onDragOver,
                handleNodeDragStop,
                handleDeleteZone,
                handleRenameZone,
                handleDeletePhantom,
                onAddCard,
                draggingGroupId,
                setDraggingGroupId,
            }}
        >
            {children}
        </MTGDeckCreatorFlowContext.Provider>
    )
}
