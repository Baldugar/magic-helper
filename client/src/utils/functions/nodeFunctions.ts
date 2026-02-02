import { Node, Rect, XYPosition } from '@xyflow/react'
import { cloneDeep } from 'lodash'
import { SetStateAction } from 'react'
import { CardNodeData } from '../../components/deckBuilder/FlowCanvas/Nodes/CardNode'
import { PhantomNodeData } from '../../components/deckBuilder/FlowCanvas/Nodes/PhantomNode'
import { ZoneNodeData } from '../../components/deckBuilder/FlowCanvas/Nodes/ZoneNode'
import { FlowZone, MTG_Deck, MTG_DeckCard, MTG_DeckCardInput, Position } from '../../graphql/types'

export type NodeType = Node<CardNodeData | ZoneNodeData | PhantomNodeData>

export const isZoneNode = (node: NodeType): node is Node<ZoneNodeData> => node.type === 'zoneNode'

export const getZoneData = (node: NodeType): ZoneNodeData => {
    const data = node.data as ZoneNodeData
    return {
        ...data,
        cardChildren: data.cardChildren ?? [],
        zoneChildren: data.zoneChildren ?? [],
    }
}

export const ensureUnique = (values: string[]): string[] => Array.from(new Set(values))

export const buildNodeMap = (nodes: NodeType[]) => {
    const map = new Map<string, NodeType>()
    nodes.forEach((n) => {
        map.set(n.id, n)
    })
    return map
}

export const computeAbsolutePosition = (node: NodeType, nodeMap: Map<string, NodeType>): XYPosition => {
    const position: XYPosition = { x: node.position.x, y: node.position.y }
    let parentId = node.parentId
    while (parentId) {
        const parent = nodeMap.get(parentId)
        if (!parent) break
        position.x += parent.position.x
        position.y += parent.position.y
        parentId = parent.parentId
    }
    return position
}

export const computeRelativePosition = (
    absolute: XYPosition,
    parentId: string | undefined,
    nodeMap: Map<string, NodeType>,
): XYPosition => {
    if (!parentId) {
        return { ...absolute }
    }
    let relX = absolute.x
    let relY = absolute.y
    let currentParentId: string | undefined = parentId
    while (currentParentId) {
        const parent = nodeMap.get(currentParentId)
        if (!parent) break
        relX -= parent.position.x
        relY -= parent.position.y
        currentParentId = parent.parentId
    }
    return { x: relX, y: relY }
}

export const isDescendant = (nodeMap: Map<string, NodeType>, ancestorId: string, candidateId: string): boolean => {
    const ancestor = nodeMap.get(ancestorId)
    if (!ancestor || !isZoneNode(ancestor)) return false
    const stack = [...getZoneData(ancestor).zoneChildren]
    while (stack.length > 0) {
        const currentId = stack.pop()!
        if (currentId === candidateId) return true
        const currentNode = nodeMap.get(currentId)
        if (currentNode && isZoneNode(currentNode)) {
            stack.push(...getZoneData(currentNode).zoneChildren)
        }
    }
    return false
}

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
        if (a.type === 'zoneNode' && b.type !== 'zoneNode') return -1
        if (a.type !== 'zoneNode' && b.type === 'zoneNode') return 1

        return depthA - depthB
    })
}

// Geometry helpers for intersection selection
export const rectOf = (node: NodeType, nodeMap: Map<string, NodeType>) => {
    const abs = computeAbsolutePosition(node, nodeMap)
    const width = node.width ?? (node.type === 'cardNode' || node.type === 'phantomNode' ? 100 : 0)
    const height = node.height ?? (node.type === 'cardNode' || node.type === 'phantomNode' ? 140 : 0)
    return { x: abs.x, y: abs.y, w: width, h: height }
}

export const overlapArea = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
) => {
    const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
    const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    return xOverlap * yOverlap
}

export const chooseCandidateZone = (
    node: NodeType,
    candidates: NodeType[],
    allNodes: NodeType[],
): NodeType | undefined => {
    if (candidates.length === 0) return undefined
    const nodeMap = buildNodeMap(allNodes)
    // deepest first
    const depthMap: Record<string, number> = {}
    const asRecord: Record<string, Node> = Object.fromEntries(allNodes.map((n) => [n.id, n as unknown as Node]))
    candidates.forEach((c) => (depthMap[c.id] = getDepth(c as unknown as Node, asRecord)))
    const maxDepth = Math.max(...candidates.map((c) => depthMap[c.id]))
    const pool = candidates.filter((c) => depthMap[c.id] === maxDepth)
    if (pool.length === 1) return pool[0]
    // largest overlap next
    const rNode = rectOf(node, nodeMap)
    let bestArea = -1
    let best: NodeType[] = []
    for (const c of pool) {
        const area = overlapArea(rNode, rectOf(c, nodeMap))
        if (area > bestArea) {
            bestArea = area
            best = [c]
        } else if (area === bestArea) {
            best.push(c)
        }
    }
    if (best.length === 1) return best[0]
    if (best.length === 0) return undefined
    // tie-breaker: top-left (min y, then min x)
    best.sort((a, b) => {
        const ra = rectOf(a, nodeMap)
        const rb = rectOf(b, nodeMap)
        if (ra.y !== rb.y) return ra.y - rb.y
        return ra.x - rb.x
    })
    return best[0]
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
    // 2. Node is free and intersecting a zone node
    // 3. Node is bound to a zone node and it is intersecting with it
    // 4. Node is bound to a zone node and it is not intersecting with any other node
    // 5. Node is bound to a zone node and it is intersecting with another zone node

    // If the node is free, we need to check if it is intersecting with any other node
    // If it's not, we don't need to do anything
    // If it is, we need to check if it's intersecting with a zone node
    // If it's not, we don't need to do anything
    // If it is, we need to bind the node to the zone node
    // In this case, we need to update the node's position to be relative to the zone node, subtracting the zone node's position from the node's position
    // We also need to update the zone node's data to include the node's id in the childrenIDs array

    // If the node is bound to a zone node, we need to check if it is intersecting with any other node
    // If it's not, we need to unbind the node from the zone node
    // In this case, we need to update the node's position to be absolute, setting it back to the original position
    // We also need to update the zone node's data to exclude the node's id from the childrenIDs array

    // If the node is bound to a zone node and it is intersecting with another zone node
    // We need to check if the node's parent is the same as the intersecting zone node
    // If it is, we don't need to do anything
    // If it's not, we need to rebind the node to the intersecting zone node
    // In this case, we may need to update the node's position to be relative to the new zone node, adding the original zone node's position to the node's position and subtracting the new zone node's position from the node's position
    // We also need to update the zone node's data to include the node's id in the childrenIDs array
    // We also need to update the original zone node's data to exclude the node's id from the childrenIDs array

    if (isZoneNode(node)) {
        const nodeMap = buildNodeMap(nodes)
        const currentParentId = node.parentId
        const absolutePosition = computeAbsolutePosition(node, nodeMap)
        const intersectingZones = getIntersectingNodes(node).filter(
            (n) => n.type === 'zoneNode' && n.id !== node.id,
        ) as NodeType[]

        const candidateParent = intersectingZones.find((candidate) => !isDescendant(nodeMap, node.id, candidate.id))

        if (!candidateParent && !currentParentId) {
            return
        }

        if (candidateParent && candidateParent.id === currentParentId) {
            return
        }

        const targetParentId = candidateParent?.id
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const relativePosition = computeRelativePosition(absolutePosition, targetParentId, nodeMap)
                return {
                    ...n,
                    position: relativePosition,
                    parentId: targetParentId,
                }
            }
            if (targetParentId && n.id === targetParentId) {
                const data = getZoneData(n)
                return {
                    ...n,
                    data: {
                        ...data,
                        zoneChildren: ensureUnique([...data.zoneChildren, node.id]),
                    },
                }
            }
            if (currentParentId && n.id === currentParentId) {
                const data = getZoneData(n)
                return {
                    ...n,
                    data: {
                        ...data,
                        zoneChildren: data.zoneChildren.filter((id) => id !== node.id),
                    },
                }
            }
            return n
        })

        setNodes(sortNodesByNesting(newNodes))
        return
    }

    // Get the intersecting nodes
    const intersectingNodes = getIntersectingNodes(node)

    // If the node is free and not intersecting any other node or zone node
    if (!node.parentId && (intersectingNodes.length === 0 || intersectingNodes.every((n) => n.type !== 'zoneNode'))) {
        return
    }

    // If the node is free and intersecting a zone node
    if (!node.parentId && intersectingNodes.some((n) => n.type === 'zoneNode')) {
        const zoneNode = intersectingNodes.find((n) => n.type === 'zoneNode') as Node
        const zoneNodeData = zoneNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x - zoneNode.position.x,
                    y: n.position.y - zoneNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: zoneNode.id,
                }
            }
            if (n.id === zoneNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: ensureUnique([...zoneNodeData.childrenIDs, node.id]),
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }

    // If the node is bound to a zone node and it is intersecting with it
    if (node.parentId && intersectingNodes.some((n) => n.id === node.parentId)) {
        return
    }

    // If the node is bound to a zone node and it is not intersecting with any other node
    if (node.parentId && intersectingNodes.length === 0) {
        const zoneNode = nodes.find((n) => n.id === node.parentId) as Node
        const zoneNodeData = zoneNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x + zoneNode.position.x,
                    y: n.position.y + zoneNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: undefined,
                }
            }
            if (n.id === zoneNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: zoneNodeData.childrenIDs.filter((id) => id !== node.id),
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }

    // If the node is bound to a zone node and it is intersecting with another zone node
    // We can be sure that the node is intersecting with a zone node, because we already checked for that
    if (node.parentId && intersectingNodes.some((n) => n.type === 'zoneNode')) {
        const zoneNode = intersectingNodes.find((n) => n.type === 'zoneNode') as Node
        const zoneNodeData = zoneNode.data as { childrenIDs: string[] }
        const originalZoneNode = nodes.find((n) => n.id === node.parentId) as Node
        const originalZoneNodeData = originalZoneNode.data as { childrenIDs: string[] }
        const newNodes = nodes.map((n) => {
            if (n.id === node.id) {
                const endPosition: XYPosition = {
                    x: n.position.x + originalZoneNode.position.x - zoneNode.position.x,
                    y: n.position.y + originalZoneNode.position.y - zoneNode.position.y,
                }
                return {
                    ...n,
                    position: endPosition,
                    parentId: zoneNode.id,
                }
            }
            if (n.id === zoneNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: ensureUnique([...zoneNodeData.childrenIDs, node.id]),
                    },
                }
            }
            if (n.id === originalZoneNode.id) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        childrenIDs: originalZoneNodeData.childrenIDs.filter((id) => id !== node.id),
                    },
                }
            }
            return n
        })
        setNodes(sortNodesByNesting(newNodes))
        return
    }
}

export const organizeNodes = (deck: MTG_Deck | undefined, getNodes: () => NodeType[]): NodeType[] => {
    if (!deck) return getNodes()

    const existingMap = new Map(getNodes().map((n) => [n.id, n]))
    const nextNodes: NodeType[] = []
    const seenIDs = new Set<string>()

    // 🔹 Helper para crear nodos (manteniendo posición previa si existe)
    const ensureNode = <T extends NodeType>(
        ID: string,
        type: string,
        data: T['data'],
        position: { x: number; y: number },
        parentID?: string,
        width?: number,
        height?: number,
    ) => {
        const existing = existingMap.get(ID)
        seenIDs.add(ID)

        // Si ya existía, actualizamos solo si el data cambió
        if (existing) {
            const dataChanged = JSON.stringify(existing.data) !== JSON.stringify(data)
            nextNodes.push({
                ...existing,
                data: dataChanged ? data : existing.data,
                type,
                parentId: parentID ?? existing.parentId,
                width: width ?? existing.width,
                height: height ?? existing.height,
            })
        } else {
            nextNodes.push({
                id: ID,
                type,
                data,
                position,
                parentId: parentID,
                width,
                height,
            } as NodeType)
        }
    }

    // =====================================================
    // 🔹 ZONES
    // =====================================================
    const zoneParentRelations: Record<string, string | undefined> = {}
    for (const zone of deck.zones) {
        const data: ZoneNodeData = {
            label: zone.name,
            cardChildren: zone.cardChildren,
            zoneChildren: zone.zoneChildren,
        }
        ensureNode(zone.ID, 'zoneNode', data, zone.position, undefined, zone.width, zone.height)

        // Registrar relaciones entre zonas
        zone.zoneChildren?.forEach((childID) => {
            zoneParentRelations[childID] = zone.ID
        })
    }

    // Asignar padres a las zonas hijas
    for (const zone of deck.zones) {
        const parentID = zoneParentRelations[zone.ID]
        if (parentID) {
            const node = nextNodes.find((n) => n.id === zone.ID)
            if (node) node.parentId = parentID
        }
    }

    // =====================================================
    // 🔹 CARDS
    // =====================================================
    for (const card of deck.cards) {
        const parentID = deck.zones.find((z) => z.cardChildren.includes(card.card.ID))?.ID
        const data: CardNodeData = { card: card.card, selectedVersionID: card.selectedVersionID }
        ensureNode(card.card.ID, 'cardNode', data, card.position, parentID)

        // 🔹 Phantoms
        for (const p of card.phantoms) {
            const phantomParentID = deck.zones.find((z) => z.cardChildren.includes(p.ID))?.ID
            const phantomData: PhantomNodeData = {
                card,
                phantomOf: card.card.ID,
                position: p.position,
            }
            ensureNode(p.ID, 'phantomNode', phantomData, p.position, phantomParentID)
        }
    }

    // =====================================================
    // 🔹 MANTENER nodos existentes no eliminados
    // =====================================================
    const resultNodes = [
        ...nextNodes,
        // conservamos nodos antiguos que sigan siendo válidos
        ...getNodes().filter((n) => !seenIDs.has(n.id) && existingMap.has(n.id)),
    ]

    return resultNodes
}

export const calculateCardsFromNodes = (nodes: Node[], currentCards: MTG_DeckCard[]): MTG_DeckCardInput[] => {
    // Usamos un Map para unir los cards (clave: ID del card)
    const cardMap = new Map<string, MTG_DeckCardInput>()

    // Separamos los nodes según su tipo
    const cardNodes: Node<CardNodeData>[] = []
    const phantomNodes: Node<PhantomNodeData>[] = []
    const zoneNodes: Node<ZoneNodeData>[] = []

    for (const node of nodes) {
        if (node.type === 'cardNode') {
            cardNodes.push(node as Node<CardNodeData>)
        }
        if (node.type === 'phantomNode') {
            phantomNodes.push(node as Node<PhantomNodeData>)
        }
        if (node.type === 'zoneNode') {
            zoneNodes.push(node as Node<ZoneNodeData>)
        }
    }

    // Procesamos los cardNodes para crear objetos con la info de cada card
    for (const node of cardNodes) {
        const cardId = node.id
        const deckCard = currentCards.find((c) => c?.card?.ID === cardId)
        if (!deckCard) continue
        const position = { x: node.position.x, y: node.position.y }

        // Obtenemos los phantoms asociados a este card
        const phantoms = phantomNodes
            .filter((p) => p.data.phantomOf === cardId)
            .map((p) => ({ ID: p.id, position: p.position }))

        // Buscamos en currentCards para obtener el count (si existe)
        const currentCard = currentCards.find((c) => c?.card?.ID === cardId)

        cardMap.set(cardId, {
            card: cardId,
            selectedVersionID: node.data.selectedVersionID,
            count: currentCard?.count || 1,
            position,
            phantoms,
            deckCardType: deckCard.deckCardType,
        })
    }

    // Añadimos los cards que están en currentCards pero que no aparecieron en los nodes.
    // Si currentCard tiene position y phantoms, los usamos; si no, asignamos valores por defecto.
    for (const currentCard of currentCards) {
        if (!currentCard?.card) continue
        const cardId = currentCard.card.ID
        if (!cardMap.has(cardId)) {
            cardMap.set(cardId, {
                card: cardId,
                selectedVersionID: currentCard.selectedVersionID,
                count: currentCard.count,
                position: currentCard.position ?? { x: 0, y: 0 },
                phantoms: currentCard.phantoms ?? [],
                deckCardType: currentCard.deckCardType,
            })
        }
    }

    return Array.from(cardMap.values())
}

export const calculateZonesFromNodes = (nodes: Node[]): FlowZone[] => {
    const zones: FlowZone[] = []
    for (const node of nodes) {
        if (node.type === 'zoneNode') {
            const zoneNode = node as Node<ZoneNodeData>
            zones.push({
                ID: zoneNode.id,
                name: zoneNode.data.label,
                position: zoneNode.position,
                width: zoneNode.width || 0,
                height: zoneNode.height || 0,
                cardChildren: zoneNode.data.cardChildren,
                zoneChildren: zoneNode.data.zoneChildren,
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
