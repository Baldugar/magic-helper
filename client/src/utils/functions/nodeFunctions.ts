import { Node, Rect, XYPosition } from '@xyflow/react'
import { cloneDeep } from 'lodash'
import { SetStateAction } from 'react'
import { FlowZone, MTG_Deck, MTG_DeckCard, MTG_DeckCardInput, Position } from '../../graphql/types'
import { CardNodeData } from '../../pages/FlowView/Nodes/CardNode'
import { GroupNodeData } from '../../pages/FlowView/Nodes/GroupNode'
import { PhantomNodeData } from '../../pages/FlowView/Nodes/PhantomNode'

export type NodeType = Node<CardNodeData | GroupNodeData | PhantomNodeData>

// Helper function to calculate depth of each node
export const getDepth = (node: Node, allNodes: Record<string, Node>) => {
    let depth = 0
    let currentNode = node

    while (currentNode.parentId) {
        depth++
        currentNode = allNodes[currentNode.parentId]
    }

    return depth
}

// Function to sort nodes by nesting without mutating the original array
export const sortNodesByNesting = (nodes: NodeType[]): NodeType[] => {
    // Create a deep copy of the nodes array to avoid mutation
    const nodesCopy = cloneDeep(nodes)

    // Create a map to easily access nodes by id
    const nodeMap: Record<string, Node> = Object.fromEntries(nodesCopy.map((node) => [node.id, node]))

    // Return a new sorted array without modifying the original
    return nodesCopy.sort((a, b) => {
        const depthA = getDepth(a, nodeMap)
        const depthB = getDepth(b, nodeMap)

        // Nodes without parentId will come first, then by depth
        if (!a.parentId && b.parentId) return -1
        if (a.parentId && !b.parentId) return 1
        if (a.type === 'group' && b.type !== 'group') return -1
        if (a.type !== 'group' && b.type === 'group') return 1

        return depthA - depthB
    })
}

export const onNodeDragStop = (
    node: NodeType,
    getIntersectingNodes: (
        node:
            | NodeType
            | Rect
            | {
                  id: Node['id']
              },
        partially?: boolean,
        nodes?: NodeType[] | undefined,
    ) => NodeType[],
    nodes: NodeType[],
    setNodes: (value: SetStateAction<NodeType[]>) => void,
) => {
    // Cases:
    // 1. Node is free and not intersecting any other node
    // 2. Node is free and intersecting a group node
    // 3. Node is bound to a group node and it is intersecting with it
    // 4. Node is bound to a group node and it is not intersecting with any other node
    // 5. Node is bound to a group node and it is intersecting with another group node

    // If the node is free, we need to check if it is intersecting with any other node
    // If it's not, we don't need to do anything
    // If it is, we need to check if it's intersecting with a group node
    // If it's not, we don't need to do anything
    // If it is, we need to bind the node to the group node
    // In this case, we need to update the node's position to be relative to the group node, subtracting the group node's position from the node's position
    // We also need to update the group node's data to include the node's id in the childrenIDs array

    // If the node is bound to a group node, we need to check if it is intersecting with any other node
    // If it's not, we need to unbind the node from the group node
    // In this case, we need to update the node's position to be absolute, setting it back to the original position
    // We also need to update the group node's data to exclude the node's id from the childrenIDs array

    // If the node is bound to a group node and it is intersecting with another group node
    // We need to check if the node's parent is the same as the intersecting group node
    // If it is, we don't need to do anything
    // If it's not, we need to rebind the node to the intersecting group node
    // In this case, we may need to update the node's position to be relative to the new group node, adding the original group node's position to the node's position and subtracting the new group node's position from the node's position
    // We also need to update the group node's data to include the node's id in the childrenIDs array
    // We also need to update the original group- node's data to exclude the node's id from the childrenIDs array

    if (node.type === 'groupNode') {
        return
    }

    // Get the intersecting nodes
    const intersectingNodes = getIntersectingNodes(node)

    // If the node is free and not intersecting any other node or group node
    if (!node.parentId && (intersectingNodes.length === 0 || intersectingNodes.every((n) => n.type !== 'groupNode'))) {
        return
    }

    // If the node is free and intersecting a group node
    if (!node.parentId && intersectingNodes.some((n) => n.type === 'groupNode')) {
        const groupNode = intersectingNodes.find((n) => n.type === 'groupNode') as Node
        const groupNodeData = groupNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x - groupNode.position.x,
                    y: n.position.y - groupNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: groupNode.id,
                }
            }
            if (n.id === groupNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: [...groupNodeData.childrenIDs, node.id],
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }

    // If the node is bound to a group node and it is intersecting with it
    if (node.parentId && intersectingNodes.some((n) => n.id === node.parentId)) {
        return
    }

    // If the node is bound to a group node and it is not intersecting with any other node
    if (node.parentId && intersectingNodes.length === 0) {
        const groupNode = nodes.find((n) => n.id === node.parentId) as Node
        const groupNodeData = groupNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x + groupNode.position.x,
                    y: n.position.y + groupNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: undefined,
                }
            }
            if (n.id === groupNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: groupNodeData.childrenIDs.filter((id) => id !== node.id),
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }

    // If the node is bound to a group node and it is intersecting with another group node
    // We can be sure that the node is intersecting with a group node, because we already checked for that
    if (node.parentId && intersectingNodes.some((n) => n.type === 'groupNode')) {
        const groupNode = intersectingNodes.find((n) => n.type === 'groupNode') as Node
        const groupNodeData = groupNode.data as { childrenIDs: string[] }
        const originalGroupNode = nodes.find((n) => n.id === node.parentId) as Node
        const originalGroupNodeData = originalGroupNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x + originalGroupNode.position.x - groupNode.position.x,
                    y: n.position.y + originalGroupNode.position.y - groupNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: groupNode.id,
                }
            }
            if (n.id === groupNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: [...groupNodeData.childrenIDs, node.id],
                    },
                }
            }
            if (n.id === originalGroupNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: originalGroupNodeData.childrenIDs.filter((id) => id !== node.id),
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }
}

export const organizeNodes = (
    deck: MTG_Deck | undefined,
    onDeleteZone: (zoneID: string, deleteNodes: boolean) => void,
    onNameChange: (zoneID: string, newName: string) => void,
    onDeletePhantom: (id: string) => void,
): NodeType[] => {
    const nodes: NodeType[] = []
    if (!deck) return nodes
    for (const zone of deck.zones) {
        const data: GroupNodeData = {
            label: zone.name,
            childrenIDs: zone.childrenIDs,
            onDelete: onDeleteZone,
            onNameChange,
        }
        nodes.push({
            id: zone.ID,
            position: zone.position,
            data,
            type: 'groupNode',
            // style: { width: zone.width, height: zone.height },
            width: zone.width,
            height: zone.height,
        } as Node<GroupNodeData>)
    }
    for (const card of deck.cards) {
        const cardData: CardNodeData = { card: card }
        nodes.push({
            id: card.card.ID,
            position: card.position,
            data: cardData,
            type: 'cardNode',
            parentId: deck.zones.find((z) => z.childrenIDs.includes(card.card.ID))?.ID,
        } as Node<CardNodeData>)
        for (const p of card.phantoms) {
            const phantomNodeData: PhantomNodeData = {
                card: card,
                phantomOf: card.card.ID,
                position: p.position,
                onDelete: onDeletePhantom,
            }
            nodes.push({
                id: p.ID,
                position: p.position,
                data: phantomNodeData,
                type: 'phantomNode',
                parentId: deck.zones.find((z) => z.childrenIDs.includes(p.ID))?.ID,
            } as Node<PhantomNodeData>)
        }
    }
    return nodes
}

export const calculateCardsFromNodes = (nodes: Node[], currentCards: MTG_DeckCard[]): MTG_DeckCardInput[] => {
    // Usamos un Map para unir los cards (clave: ID del card)
    const cardMap = new Map<string, MTG_DeckCardInput>()

    // Separamos los nodes según su tipo
    const cardNodes: Node<CardNodeData>[] = []
    const phantomNodes: Node<PhantomNodeData>[] = []
    const groupNodes: Node<GroupNodeData>[] = []

    for (const node of nodes) {
        if (node.type === 'cardNode') {
            cardNodes.push(node as Node<CardNodeData>)
        }
        if (node.type === 'phantomNode') {
            phantomNodes.push(node as Node<PhantomNodeData>)
        }
        if (node.type === 'groupNode') {
            groupNodes.push(node as Node<GroupNodeData>)
        }
    }

    // Procesamos los cardNodes para crear objetos con la info de cada card
    for (const node of cardNodes) {
        const card = node.data.card
        const cardId = card.card.ID
        const position = { x: node.position.x, y: node.position.y }

        // Obtenemos los phantoms asociados a este card
        const phantoms = phantomNodes
            .filter((p) => p.data.phantomOf === cardId)
            .map((p) => ({ ID: p.id, position: p.position }))

        // Buscamos en currentCards para obtener el count (si existe)
        const currentCard = currentCards.find((c) => c.card.ID === cardId)

        cardMap.set(cardId, {
            card: cardId,
            selectedSet: card.selectedSet,
            count: currentCard?.count || 1,
            position,
            phantoms,
            deckCardType: card.deckCardType,
            ID: cardId,
            mainOrSide: card.mainOrSide,
        })
    }

    // Añadimos los cards que están en currentCards pero que no aparecieron en los nodes.
    // Si currentCard tiene position y phantoms, los usamos; si no, asignamos valores por defecto.
    for (const currentCard of currentCards) {
        const cardId = currentCard.card.ID
        if (!cardMap.has(cardId)) {
            cardMap.set(cardId, {
                card: cardId,
                selectedSet: currentCard.selectedSet,
                count: currentCard.count,
                position: currentCard.position ?? { x: 0, y: 0 },
                phantoms: currentCard.phantoms ?? [],
                deckCardType: currentCard.deckCardType,
                ID: cardId,
                mainOrSide: currentCard.mainOrSide,
            })
        }
    }

    return Array.from(cardMap.values())
}

export const calculateZonesFromNodes = (nodes: Node[]): FlowZone[] => {
    const zones: FlowZone[] = []
    for (const node of nodes) {
        if (node.type === 'groupNode') {
            const groupNode = node as Node<GroupNodeData>
            zones.push({
                ID: groupNode.id,
                name: groupNode.data.label,
                position: groupNode.position,
                width: groupNode.width || 0,
                height: groupNode.height || 0,
                childrenIDs: groupNode.data.childrenIDs,
            })
        }
    }
    return zones
}

export const findNextAvailablePosition = (cards: MTG_DeckCard[]): Position => {
    let x = 0
    let y = 0

    // This is an infinite loop, but not in practice as there are no infinite cards
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // Check if (x, y) is occupied
        const occupied = cards.some(
            (card) =>
                (card.position.x === x && card.position.y === y) ||
                card.phantoms.some((p) => p.position.x === x && p.position.y === y),
        )

        if (!occupied) {
            // Found a free spot
            return { x, y }
        }

        // Move to next position
        x += 100
        if (x > 500) {
            x = 0
            y += 50
        }

        // In practice, you can break here or handle an upper bound for y
        // if you ever need to limit the layout to a certain number of rows.
    }
}
