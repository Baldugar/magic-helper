import { Node, Rect, XYPosition } from '@xyflow/react'
import { cloneDeep } from 'lodash'
import { SetStateAction } from 'react'
import { FlowZone, MTGA_Deck, MTGA_DeckCard, MTGA_DeckCardInput, Position } from '../../graphql/types'
import { CardNodeData } from '../../views/FlowView/Nodes/CardNode'
import { GroupNodeData } from '../../views/FlowView/Nodes/GroupNode'
import { PhantomNodeData } from '../../views/FlowView/Nodes/PhantomNode'

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
            | Node
            | Rect
            | {
                  id: NodeType['id']
              },
        partially?: boolean,
        nodes?: Node[] | undefined,
    ) => Node[],
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
    deck: MTGA_Deck | undefined,
    onDeleteZone: (zoneID: string, deleteNodes: boolean) => void,
    onNameChange: (zoneID: string, newName: string) => void,
): NodeType[] => {
    const nodes: NodeType[] = []
    if (!deck) return nodes
    const allPhantoms = deck.cards.flatMap((c) =>
        c.phantoms.map(
            (p, i) =>
                ({
                    card: c.card,
                    phantomOf: c.card.ID,
                    index: i,
                    position: p,
                } as PhantomNodeData),
        ),
    )
    for (const zone of deck.zones) {
        const data: GroupNodeData = {
            label: zone.name,
            childrenIDs: [
                ...deck.cards.filter((c) => c.position.parentID === zone.ID).map((c) => c.card.ID),
                ...allPhantoms
                    .filter((p) => p.position.parentID === zone.ID)
                    .map((p) => p.card.ID + '_phantom_' + p.index),
            ],
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
        nodes.push({
            id: card.card.ID,
            position: card.position,
            data: { label: card.card.name, card: card },
            type: 'cardNode',
            parentId: card.position.parentID,
        } as Node<CardNodeData>)
    }
    for (const phantom of allPhantoms) {
        nodes.push({
            id: phantom.card.ID + '_phantom_' + phantom.index,
            position: phantom.position,
            data: phantom,
            type: 'phantomNode',
            parentId: phantom.position.parentID,
        } as Node<PhantomNodeData>)
    }
    return nodes
}

export const calculateCardsFromNodes = (nodes: Node[], currentCards: MTGA_DeckCard[]): MTGA_DeckCardInput[] => {
    const cards: MTGA_DeckCardInput[] = []
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
    for (const node of cardNodes) {
        const card = node.data.card
        const position: Position = {
            x: node.position.x,
            y: node.position.y,
            parentID: node.parentId,
        }
        const phantoms = phantomNodes
            .filter((p) => p.data.phantomOf === card.card.ID)
            .map((p) => {
                return {
                    x: p.position.x,
                    y: p.position.y,
                    parentID: p.parentId,
                } as Position
            })
        const existingCard = currentCards.find((c) => c.card.ID === card.card.ID)
        cards.push({
            card: card.card.ID,
            count: existingCard?.count || 1,
            position,
            phantoms,
            deckCardType: card.deckCardType,
            ID: card.card.ID,
            mainOrSide: card.mainOrSide,
        })
    }
    return cards
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
            })
        }
    }
    return zones
}
