import { Node, OnNodeDrag, useReactFlow } from '@xyflow/react'
import { DragEventHandler, ReactNode } from 'react'
import { MainOrSide, MTGA_Card, MTGA_Deck, MTGA_DeckCard, MTGA_DeckCardType, Position } from '../../../graphql/types'
import { CardNodeData } from '../../../pages/FlowView/Nodes/CardNode'
import { GroupNodeData, MIN_SIZE } from '../../../pages/FlowView/Nodes/GroupNode'
import { PhantomNodeData } from '../../../pages/FlowView/Nodes/PhantomNode'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import {
    findNextAvailablePosition,
    NodeType,
    onNodeDragStop,
    sortNodesByNesting,
} from '../../../utils/functions/nodeFunctions'
import { useDnD } from '../../DnD/useDnD'
import { useMTGADeckCreator } from '../DeckCreator/useMTGADeckCreator'
import { MTGADeckCreatorFlowContext } from './MTGADeckCreatorFlowContext'

export const MTGADeckCreatorFlowProvider = ({ children, deck }: { children: ReactNode; deck: MTGA_Deck }) => {
    const { card, type } = useDnD()
    const { selectingCommander, setSelectingCommander, deckTab, setDeck, removeCard } = useMTGADeckCreator()
    const { screenToFlowPosition, getIntersectingNodes, setNodes, getNodes } = useReactFlow<NodeType>()

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
                        removeCard((n as Node<CardNodeData>).data.card)
                    }
                    if (n.type === 'phantomNode') {
                        const phantomData = (n as Node<PhantomNodeData>).data
                        handleDeletePhantom(phantomData.card.ID, phantomData.index)
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
                            data: { ...n.data, parentID: undefined },
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

    const handleDeletePhantom = (cardID: string, phantomIndex: number) => {
        setNodes((nodes) => {
            const node = nodes.find((n) => n.id === cardID)
            if (!node) return nodes
            const phantomNode = nodes.find((n) => n.id === cardID + '_phantom_' + phantomIndex)
            if (!phantomNode) return nodes
            return nodes.filter((n) => n.id !== phantomNode.id)
        })
    }
    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (card: MTGA_Card, position?: Position): MTGA_DeckCard | undefined => {
        let cardToReturn: MTGA_DeckCard | undefined
        if (deck) {
            const newDeck = structuredClone(deck)
            if (selectingCommander) {
                // Remove the previous commander
                const previousCommander = newDeck.cards.find((c) => c.deckCardType === MTGA_DeckCardType.COMMANDER)
                if (previousCommander) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMMANDER)
                }
                // Add the new commander
                cardToReturn = {
                    card,
                    count: 1,
                    deckCardType: MTGA_DeckCardType.COMMANDER,
                    mainOrSide: MainOrSide.MAIN,
                    position: position || { x: 0, y: 0 },
                    phantoms: [],
                }
                newDeck.cards.push(cardToReturn)
                setSelectingCommander(false)
            } else {
                const mainOrSide = deckTab === 'main' ? MainOrSide.MAIN : MainOrSide.SIDEBOARD
                const ID = card.ID
                const index = newDeck.cards.findIndex((c) => c.card.ID === ID && c.mainOrSide === mainOrSide)
                const nextAvailableSpot = findNextAvailablePosition(newDeck.cards)
                // If the card is already in the deck, add a phantom
                if (index !== -1) {
                    // TODO: Add +1 on count if the card is already in the deck
                    newDeck.cards[index].phantoms.push(position || nextAvailableSpot)
                    cardToReturn = structuredClone(newDeck.cards[index])
                } else {
                    cardToReturn = {
                        card,
                        count: 1,
                        deckCardType: MTGA_DeckCardType.NORMAL,
                        mainOrSide,
                        position: position || nextAvailableSpot,
                        phantoms: [],
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

        const deckCard = onAddCard(card, position)

        const cardID = card.ID
        const nodes = getNodes()
        const idx = nodes.findIndex((n) => n.id === cardID)
        // If the card is already in the deck, add a phantom
        if (idx !== -1) {
            const idx = nodes.filter((n) => n.id !== cardID && n.id.startsWith(cardID)).length
            const phantomData: PhantomNodeData = {
                card,
                index: idx,
                phantomOf: cardID,
                position,
                onDelete: handleDeletePhantom,
            }
            newNode = {
                data: phantomData,
                id: cardID + '_phantom_' + idx,
                position,
                type: 'phantomNode',
            } as Node<PhantomNodeData>
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
        <MTGADeckCreatorFlowContext.Provider
            value={{
                onDrop,
                onDragOver,
                handleNodeDragStop,
                handleDeleteZone,
                handleRenameZone,
                handleDeletePhantom,
            }}
        >
            {children}
        </MTGADeckCreatorFlowContext.Provider>
    )
}
