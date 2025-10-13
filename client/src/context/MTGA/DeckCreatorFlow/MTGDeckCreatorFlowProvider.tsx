import { Node, OnNodeDrag, useReactFlow } from '@xyflow/react'
import { ReactNode, SetStateAction, useCallback, useState } from 'react'
import { CardNodeData } from '../../../components/deckBuilder/FlowCanvas/Nodes/CardNode'
import { GroupNodeData } from '../../../components/deckBuilder/FlowCanvas/Nodes/GroupNode'
import { PhantomNodeData } from '../../../components/deckBuilder/FlowCanvas/Nodes/PhantomNode'
import { MainOrSide, MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType, Position } from '../../../graphql/types'
import { singleSetSelected } from '../../../utils/functions/filterFunctions'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import {
    calculateCardsFromNodes,
    calculateZonesFromNodes,
    findNextAvailablePosition,
    NodeType,
    onNodeDragStop,
    sortNodesByNesting,
} from '../../../utils/functions/nodeFunctions'
import { useMTGDeckCreator } from '../DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGDeckCreatorFlowContext } from './MTGDeckCreatorFlowContext'

export const MTGDeckCreatorFlowProvider = ({ children, deck }: { children: ReactNode; deck: MTG_Deck }) => {
    const { deckTab, setDeck, removeCard } = useMTGDeckCreator()
    const [readOnly, setReadOnly] = useState(false)
    const [moveMode, setMoveMode] = useState(false)
    const { getIntersectingNodes, getNodes } = useReactFlow<NodeType>()

    const { filter, setFilter } = useMTGFilter()
    const set = singleSetSelected(filter)

    const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)

    const syncDeckFromNodes = useCallback(
        (nodes: NodeType[]) => {
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck

                const nodeArray = nodes as unknown as Node[]
                const cardInputs = calculateCardsFromNodes(nodeArray, prevDeck.cards)
                const zones = calculateZonesFromNodes(nodeArray)

                const existingCardMap = new Map(prevDeck.cards.map((card) => [card.card.ID, card]))
                const updatedCards: MTG_DeckCard[] = []
                for (const input of cardInputs) {
                    const existing = existingCardMap.get(input.card)
                    if (!existing) continue
                    updatedCards.push({
                        ...existing,
                        count: input.count,
                        position: input.position,
                        phantoms: input.phantoms,
                        selectedVersionID: input.selectedVersionID,
                        deckCardType: input.deckCardType,
                        mainOrSide: input.mainOrSide,
                    })
                }

                let cardsChanged = false
                if (updatedCards.length !== prevDeck.cards.length) {
                    cardsChanged = true
                } else {
                    for (let i = 0; i < updatedCards.length; i += 1) {
                        const prev = prevDeck.cards[i]
                        const next = updatedCards[i]
                        if (prev.card.ID !== next.card.ID || prev.count !== next.count) {
                            cardsChanged = true
                            break
                        }
                        if (
                            prev.position.x !== next.position.x ||
                            prev.position.y !== next.position.y ||
                            prev.selectedVersionID !== next.selectedVersionID ||
                            prev.deckCardType !== next.deckCardType ||
                            prev.mainOrSide !== next.mainOrSide
                        ) {
                            cardsChanged = true
                            break
                        }
                        if (prev.phantoms.length !== next.phantoms.length) {
                            cardsChanged = true
                            break
                        }
                        for (let j = 0; j < prev.phantoms.length; j += 1) {
                            const prevPhantom = prev.phantoms[j]
                            const nextPhantom = next.phantoms[j]
                            if (
                                prevPhantom.ID !== nextPhantom.ID ||
                                prevPhantom.position.x !== nextPhantom.position.x ||
                                prevPhantom.position.y !== nextPhantom.position.y
                            ) {
                                cardsChanged = true
                                break
                            }
                        }
                        if (cardsChanged) break
                    }
                }

                let zonesChanged = false
                if (prevDeck.zones.length !== zones.length) {
                    zonesChanged = true
                } else {
                    const prevZoneMap = new Map(prevDeck.zones.map((zone) => [zone.ID, zone]))
                    for (const zone of zones) {
                        const prevZone = prevZoneMap.get(zone.ID)
                        if (!prevZone) {
                            zonesChanged = true
                            break
                        }
                        if (
                            prevZone.position.x !== zone.position.x ||
                            prevZone.position.y !== zone.position.y ||
                            prevZone.width !== zone.width ||
                            prevZone.height !== zone.height
                        ) {
                            zonesChanged = true
                            break
                        }
                        if (
                            prevZone.cardChildren.length !== zone.cardChildren.length ||
                            prevZone.cardChildren.some((id, index) => id !== zone.cardChildren[index])
                        ) {
                            zonesChanged = true
                            break
                        }
                        if (
                            prevZone.zoneChildren.length !== zone.zoneChildren.length ||
                            prevZone.zoneChildren.some((id, index) => id !== zone.zoneChildren[index])
                        ) {
                            zonesChanged = true
                            break
                        }
                    }
                    if (!zonesChanged) {
                        const zoneIdSet = new Set(zones.map((z) => z.ID))
                        if (prevDeck.zones.some((zone) => !zoneIdSet.has(zone.ID))) {
                            zonesChanged = true
                        }
                    }
                }

                if (!cardsChanged && !zonesChanged) {
                    return prevDeck
                }

                return {
                    ...prevDeck,
                    cards: updatedCards,
                    zones,
                }
            })
        },
        [setDeck],
    )

    // Helper: apply a nodes update and immediately sync the deck from the resulting nodes.
    const applyNodesUpdate = useCallback(
        (value: SetStateAction<NodeType[]>) => {
            let nextNodes: NodeType[] | undefined
            if (typeof value === 'function') {
                applyNodesUpdate((prev) => {
                    nextNodes = (value as (prev: NodeType[]) => NodeType[])(prev)
                    return nextNodes
                })
            } else {
                nextNodes = value as NodeType[]
                applyNodesUpdate(nextNodes)
            }
            if (nextNodes) {
                syncDeckFromNodes(nextNodes)
            }
        },
        [syncDeckFromNodes],
    )

    // Zone Functions
    const handleDeleteZone = (nodeID: string, deleteNodes: boolean) => {
        if (readOnly) return
        let nextNodes: NodeType[] | undefined
        applyNodesUpdate((nodes) => {
            const zoneNode = nodes.find((n) => n.id === nodeID)
            if (!zoneNode) {
                nextNodes = nodes
                return nodes
            }
            const nodeMap = new Map(nodes.map((n) => [n.id, n]))
            const zoneData = zoneNode.data as GroupNodeData
            const cardChildren = zoneData.cardChildren ?? []
            const zoneChildren = zoneData.zoneChildren ?? []

            const removeFromParent = (inputNodes: NodeType[]): NodeType[] =>
                inputNodes.map((n) => {
                    if (n.type === 'groupNode') {
                        const data = n.data as GroupNodeData
                        if (data.zoneChildren?.includes(nodeID)) {
                            return {
                                ...n,
                                data: {
                                    ...data,
                                    zoneChildren: data.zoneChildren.filter((id) => id !== nodeID),
                                },
                            }
                        }
                    }
                    return n
                })

            const getAbsolutePosition = (node: NodeType): Position => {
                let absX = node.position.x
                let absY = node.position.y
                let parentId = node.parentId
                while (parentId) {
                    const parent = nodeMap.get(parentId)
                    if (!parent) break
                    absX += parent.position.x
                    absY += parent.position.y
                    parentId = parent.parentId
                }
                return { x: absX, y: absY }
            }

            if (deleteNodes) {
                const zonesToRemove = new Set<string>([nodeID])
                const cardsToRemove = new Set<string>()

                const collectZoneTree = (zoneId: string) => {
                    const currentZone = nodeMap.get(zoneId)
                    if (!currentZone || currentZone.type !== 'groupNode') return
                    const currentData = currentZone.data as GroupNodeData
                    currentData.cardChildren?.forEach((cardId) => cardsToRemove.add(cardId))
                    currentData.zoneChildren?.forEach((childZoneId) => {
                        if (!zonesToRemove.has(childZoneId)) {
                            zonesToRemove.add(childZoneId)
                            collectZoneTree(childZoneId)
                        }
                    })
                }

                collectZoneTree(nodeID)

                const phantomIdsToRemove = new Set<string>()
                nodes.forEach((n) => {
                    if (n.type === 'phantomNode') {
                        const phantomData = n.data as PhantomNodeData
                        if (cardsToRemove.has(phantomData.phantomOf)) {
                            phantomIdsToRemove.add(n.id)
                        }
                    }
                })

                nodes.forEach((n) => {
                    if (n.type === 'cardNode' && cardsToRemove.has(n.id)) {
                        removeCard((n.data as CardNodeData).card.card)
                    }
                })

                const idsToRemove = new Set<string>([...zonesToRemove, ...cardsToRemove, ...phantomIdsToRemove])

                const filtered = nodes.filter((n) => !idsToRemove.has(n.id))

                const normalized = filtered.map((n) => {
                    if (n.type === 'groupNode') {
                        const data = n.data as GroupNodeData
                        return {
                            ...n,
                            data: {
                                ...data,
                                cardChildren: (data.cardChildren ?? []).filter((id) => !cardsToRemove.has(id)),
                                zoneChildren: (data.zoneChildren ?? []).filter((id) => !zonesToRemove.has(id)),
                            },
                        }
                    }
                    return n
                })

                const sorted = sortNodesByNesting(normalized)
                nextNodes = sorted
                return sorted
            }

            const cardAbsolutePositions = new Map<string, Position>()
            cardChildren.forEach((cardId) => {
                const cardNode = nodeMap.get(cardId)
                if (cardNode) {
                    cardAbsolutePositions.set(cardId, getAbsolutePosition(cardNode))
                }
            })

            const zoneAbsolutePositions = new Map<string, Position>()
            zoneChildren.forEach((zoneId) => {
                const childZoneNode = nodeMap.get(zoneId)
                if (childZoneNode) {
                    zoneAbsolutePositions.set(zoneId, getAbsolutePosition(childZoneNode))
                }
            })

            const updated = removeFromParent(
                nodes
                    .filter((n) => n.id !== nodeID)
                    .map((n) => {
                        if (n.type === 'cardNode' && cardAbsolutePositions.has(n.id)) {
                            return {
                                ...n,
                                parentId: undefined,
                                position: cardAbsolutePositions.get(n.id)!,
                            }
                        }
                        if (n.type === 'groupNode' && zoneAbsolutePositions.has(n.id)) {
                            return {
                                ...n,
                                parentId: undefined,
                                position: zoneAbsolutePositions.get(n.id)!,
                                data: n.data,
                            }
                        }
                        if (n.type === 'groupNode') {
                            const data = n.data as GroupNodeData
                            return {
                                ...n,
                                data: {
                                    ...data,
                                    zoneChildren: (data.zoneChildren ?? []).filter((id) => id !== nodeID),
                                },
                            }
                        }
                        return n
                    }),
            )

            const sorted = sortNodesByNesting(updated)
            nextNodes = sorted
            return sorted
        })
        if (nextNodes) {
            syncDeckFromNodes(nextNodes)
        }
    }

    const handleRenameZone = (nodeID: string, newName: string) => {
        if (readOnly) return
        let nextNodes: NodeType[] | undefined
        applyNodesUpdate((nodes) => {
            const node = nodes.find((n) => n.id === nodeID)
            if (!node) {
                nextNodes = nodes
                return nodes
            }
            const updated = nodes.map((n) => {
                if (n.id === nodeID) {
                    return {
                        ...n,
                        data: { ...n.data, label: newName },
                    }
                }
                return n
            })
            nextNodes = updated
            return updated
        })
        if (nextNodes) {
            syncDeckFromNodes(nextNodes)
        }
    }

    const handleDeletePhantom = (phantomID: string) => {
        if (readOnly) return
        let nextNodes: NodeType[] | undefined
        applyNodesUpdate((nodes) => {
            const phantomNode = nodes.find((n) => n.id === phantomID)
            if (!phantomNode) {
                nextNodes = nodes
                return nodes
            }
            const updated = nodes
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
            nextNodes = updated
            return updated
        })
        if (nextNodes) {
            syncDeckFromNodes(nextNodes)
        }
    }
    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (card: MTG_Card, position?: Position): MTG_DeckCard | undefined => {
        if (readOnly) return undefined
        let cardToReturn: MTG_DeckCard | undefined
        if (deck) {
            const newDeck = structuredClone(deck)
            if (filter.isSelectingCommander) {
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
                setFilter((prevFilter) => ({
                    ...prevFilter,
                    page: 0,
                    commander: card.ID,
                    isSelectingCommander: false,
                }))
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

    // This function is called when a node is dragged and dropped inside the flow view
    const handleNodeDragStop: OnNodeDrag<NodeType> = (_, node) => {
        if (readOnly) return
        const nodes = getNodes()
        const setter = (value: SetStateAction<NodeType[]>) => {
            let nextNodes: NodeType[] | undefined
            if (typeof value === 'function') {
                applyNodesUpdate((prev) => {
                    nextNodes = (value as (prev: NodeType[]) => NodeType[])(prev)
                    return nextNodes
                })
            } else {
                nextNodes = value as NodeType[]
                applyNodesUpdate(nextNodes)
            }
            if (nextNodes) {
                syncDeckFromNodes(nextNodes)
            }
        }
        onNodeDragStop(node, getIntersectingNodes, nodes, setter)
    }

    return (
        <MTGDeckCreatorFlowContext.Provider
            value={{
                handleNodeDragStop,
                handleDeleteZone,
                handleRenameZone,
                handleDeletePhantom,
                onAddCard,
                draggingGroupId,
                setDraggingGroupId,
                readOnly,
                setReadOnly,
                moveMode,
                setMoveMode,
            }}
        >
            {children}
        </MTGDeckCreatorFlowContext.Provider>
    )
}
