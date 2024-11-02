import { Node, OnNodeDrag, useNodesState, useReactFlow } from '@xyflow/react'
import { debounce } from 'lodash'
import { DragEventHandler, useCallback, useEffect } from 'react'
import { useDnD } from '../../context/DnD/useDnD'
import { useMTGACards } from '../../context/MTGA/Cards/useMTGACards'
import { useMTGADeckCreator } from '../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { FlowZone, MainOrSide, MTGA_Card, MTGA_DeckCard, MTGA_DeckCardType, Position } from '../../graphql/types'
import { uuidv4 } from '../../utils/functions/IDFunctions'
import {
    calculateCardsFromNodes,
    calculateZonesFromNodes,
    onNodeDragStop,
    organizeNodes,
    sortNodesByNesting,
} from '../../utils/functions/nodeFunctions'
import { CardNodeData } from './Nodes/CardNode'
import { GroupNodeData } from './Nodes/GroupNode'
import { PhantomNodeData } from './Nodes/PhantomNode'

export const useFlowViewState = () => {
    const { cards } = useMTGACards()
    const { card, type } = useDnD()
    const { deck, selectingCommander, setSelectingCommander, deckTab, setDeck } = useMTGADeckCreator()
    const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
    const [nodes, setNodes, onNodesChange] = useNodesState(organizeNodes(deck))

    // Organize the nodes when the deck is loaded
    useEffect(() => {
        if (deck && nodes.length === 0) {
            setNodes(organizeNodes(deck))
        }
    }, [deck, nodes, setNodes])

    // Propagate changes in the nodes to the deck once the user stops doing changes
    useEffect(() => {
        const debounced = debounce(
            () =>
                setDeck((prev) =>
                    prev
                        ? {
                              ...prev,
                              cards: calculateCardsFromNodes(nodes).map((c) => ({
                                  ...c,
                                  card: cards.find((card) => card.ID === c.card)!,
                              })),
                              zones: calculateZonesFromNodes(nodes) as FlowZone[],
                              ID: prev.ID,
                          }
                        : prev,
                ),
            250,
        )
        debounced()

        return () => {
            debounced.cancel()
        }
    }, [nodes, cards, setDeck])

    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = useCallback(
        (card: MTGA_Card, position?: Position): MTGA_DeckCard | undefined => {
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
                    // If the card is already in the deck, add a phantom
                    if (index !== -1) {
                        // TODO: Add +1 on count if the card is already in the deck
                        if (position) {
                            newDeck.cards[index].phantoms.push(position)
                            cardToReturn = structuredClone(newDeck.cards[index])
                        }
                    } else {
                        cardToReturn = {
                            card,
                            count: 1,
                            deckCardType: MTGA_DeckCardType.NORMAL,
                            mainOrSide,
                            position: position || { x: 0, y: 0 },
                            phantoms: [],
                        }
                        newDeck.cards.push(cardToReturn)
                    }
                }
                setDeck(newDeck)
            }
            return cardToReturn
        },
        [deck, deckTab, selectingCommander, setDeck, setSelectingCommander],
    )

    // This function is called when a card is dragged over the flow view
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
            } else {
                newNode = {
                    id: cardID,
                    type: 'cardNode',
                    position,
                    data: { label: card.name, card: deckCard },
                } as Node<CardNodeData>
            }
            if (!newNode) return
            setNodes((nds) => sortNodesByNesting(nds.concat(newNode!)))
        },
        [screenToFlowPosition, type, setNodes, card, onAddCard, nodes],
    )

    // This function is called when a node is dragged and dropped inside the flow view
    const handleNodeDragStop: OnNodeDrag<Node> = (_, node) => {
        onNodeDragStop(node, getIntersectingNodes, nodes, setNodes)
    }

    return {
        nodes,
        onDrop,
        onDragOver,
        handleNodeDragStop,
        onNodesChange,
        setNodes,
    }
}
