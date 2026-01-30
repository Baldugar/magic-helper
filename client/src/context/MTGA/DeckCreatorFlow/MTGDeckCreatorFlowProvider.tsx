import { Node, NodeChange, OnNodeDrag, useReactFlow } from '@xyflow/react'
import { cloneDeep } from 'lodash'
import { ReactNode, useCallback, useState } from 'react'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import {
    buildNodeMap,
    computeAbsolutePosition,
    computeRelativePosition,
    getDepth,
    isDescendant,
    NodeType,
    overlapArea,
    rectOf,
    sortNodesByNesting,
} from '../../../utils/functions/nodeFunctions'
import { useMTGDeckCreatorLogic } from '../DeckCreator/Logic/useMTGDeckCreatorLogic'
import { MTGDeckCreatorFlowContext } from './MTGDeckCreatorFlowContext'

const CARD_DEFAULT_WIDTH = 100
const CARD_DEFAULT_HEIGHT = 140
const ZONE_MIN_SIZE = 180

const getNodeSize = (node: NodeType) => {
    if (typeof node.width === 'number' && typeof node.height === 'number') {
        return { width: node.width, height: node.height }
    }
    if (node.type === 'cardNode' || node.type === 'phantomNode') {
        return { width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT }
    }
    return { width: ZONE_MIN_SIZE, height: ZONE_MIN_SIZE }
}

const applyChangesToNodeMap = (nodeMap: Map<string, NodeType>, changes: NodeChange<NodeType>[]) => {
    let updated = false
    for (const change of changes) {
        if (change.type === 'position' && change.position) {
            const node = nodeMap.get(change.id)
            if (!node) continue
            const next: NodeType = {
                ...node,
                position: { ...node.position, ...change.position },
            }
            nodeMap.set(change.id, next)
            updated = true
            continue
        }
        if (change.type === 'dimensions') {
            const node = nodeMap.get(change.id)
            if (!node) continue
            let nextPosition = node.position
            const pos = 'position' in change ? (change as { position?: { x?: number; y?: number } }).position : undefined
            if (pos) {
                nextPosition = { ...node.position, ...pos }
            }
            const next: NodeType = {
                ...node,
                position: nextPosition,
                width: change.dimensions?.width ?? node.width,
                height: change.dimensions?.height ?? node.height,
            }
            nodeMap.set(change.id, next)
            updated = true
        }
    }
    return updated
}

const collectZoneAncestors = (nodeId: string, nodeMap: Map<string, NodeType>) => {
    const ancestors: string[] = []
    let current = nodeMap.get(nodeId)
    while (current && current.parentId) {
        const parent = nodeMap.get(current.parentId)
        if (!parent) break
        if (parent.type === 'zoneNode') {
            ancestors.push(parent.id)
        }
        current = parent
    }
    return ancestors
}

const expandZoneToFitChildren = (zoneId: string, nodeMap: Map<string, NodeType>) => {
    const zoneNode = nodeMap.get(zoneId)
    if (!zoneNode || zoneNode.type !== 'zoneNode') return false
    const zoneData = zoneNode.data as { cardChildren: string[]; zoneChildren: string[] }
    const childIds = [...(zoneData.cardChildren ?? []), ...(zoneData.zoneChildren ?? [])]
    if (childIds.length === 0) return false

    const children = childIds
        .map((childId) => nodeMap.get(childId))
        .filter((child): child is NodeType => !!child)

    if (children.length === 0) return false

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    children.forEach((child) => {
        const { width, height } = getNodeSize(child)
        const childX = child.position?.x ?? 0
        const childY = child.position?.y ?? 0
        minX = Math.min(minX, childX)
        minY = Math.min(minY, childY)
        maxX = Math.max(maxX, childX + width)
        maxY = Math.max(maxY, childY + height)
    })

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return false
    }

    const shiftX = minX < 0 ? -minX : 0
    const shiftY = minY < 0 ? -minY : 0
    let didUpdate = false

    if (shiftX > 0 || shiftY > 0) {
        children.forEach((child) => {
            const next: NodeType = {
                ...child,
                position: {
                    x: (child.position?.x ?? 0) + shiftX,
                    y: (child.position?.y ?? 0) + shiftY,
                },
            }
            nodeMap.set(child.id, next)
        })

        const adjustedZonePosition = {
            x: (zoneNode.position?.x ?? 0) - shiftX,
            y: (zoneNode.position?.y ?? 0) - shiftY,
        }
        const nextZone: NodeType = {
            ...zoneNode,
            position: adjustedZonePosition,
        }
        nodeMap.set(zoneId, nextZone)
        didUpdate = true
    }

    // recompute bounds using the possibly shifted children
    let rightExtent = -Infinity
    let bottomExtent = -Infinity
    children.forEach((child) => {
        const current = nodeMap.get(child.id)
        if (!current) return
        const { width, height } = getNodeSize(current)
        const x = current.position?.x ?? 0
        const y = current.position?.y ?? 0
        rightExtent = Math.max(rightExtent, x + width)
        bottomExtent = Math.max(bottomExtent, y + height)
    })

    const currentZone = nodeMap.get(zoneId)
    if (!currentZone) return didUpdate

    const targetWidth = Math.max(rightExtent, currentZone.width ?? ZONE_MIN_SIZE, ZONE_MIN_SIZE)
    const targetHeight = Math.max(bottomExtent, currentZone.height ?? ZONE_MIN_SIZE, ZONE_MIN_SIZE)

    if ((currentZone.width ?? 0) < targetWidth || (currentZone.height ?? 0) < targetHeight) {
        const nextZone: NodeType = {
            ...currentZone,
            width: targetWidth,
            height: targetHeight,
        }
        nodeMap.set(zoneId, nextZone)
        didUpdate = true
    }

    return didUpdate
}

export const MTGDeckCreatorFlowProvider = ({ children }: { children: ReactNode }) => {
    const [readOnly, setReadOnly] = useState(false)
    const [draggingZoneIDs, setDraggingZoneIDs] = useState<string[]>([])
    const [temporarilyUnlockedZoneIDs, setTemporarilyUnlockedZoneIDs] = useState<string[]>([])
    const [isDirty, setIsDirty] = useState(false)
    const { deck, setDeck } = useMTGDeckCreatorLogic()
    const reactFlow = useReactFlow<NodeType>()

    const onAddZone = (name: string) => {
        const newDeck = structuredClone(deck)
        newDeck.zones.push({
            ID: uuidv4(),
            name,
            position: { x: 0, y: 0 },
            width: 200,
            height: 300,
            cardChildren: [],
            zoneChildren: [],
        })
        setDeck(newDeck)
    }

    const handleNodeDragStart: OnNodeDrag<NodeType> = (_, __, nodes) => {
        const zoneNodes = nodes.filter((node) => node.type === 'zoneNode')
        if (zoneNodes.length > 0) {
            setDraggingZoneIDs(zoneNodes.map((node) => node.id))
        } else {
            setDraggingZoneIDs([])
        }

        const allNodes = reactFlow.getNodes()
        if (allNodes.length === 0) {
            setTemporarilyUnlockedZoneIDs([])
            return
        }

        const nodeMap = buildNodeMap(allNodes)
        const toUnlock = new Set<string>()

        for (const selection of nodes) {
            const resolved = nodeMap.get(selection.id) ?? selection
            if (resolved.type === 'zoneNode') {
                const parent = resolved.parentId ? nodeMap.get(resolved.parentId) : undefined
                if (parent && parent.type === 'zoneNode') {
                    toUnlock.add(resolved.id)
                }
            }

            let currentParentId = resolved.parentId
            while (currentParentId) {
                const currentParent = nodeMap.get(currentParentId)
                if (!currentParent) break
                if (currentParent.type === 'zoneNode' && currentParent.parentId) {
                    toUnlock.add(currentParent.id)
                }
                currentParentId = currentParent.parentId
            }
        }

        setTemporarilyUnlockedZoneIDs(Array.from(toUnlock))
    }

    const handlePaneClick: (event: React.MouseEvent) => void = () => {
        setDraggingZoneIDs([])
        setTemporarilyUnlockedZoneIDs([])
    }

    const getTopLevelSelection = (selected: NodeType[]): NodeType[] => {
        const selectedIds = new Set(selected.map((n) => n.id))
        return selected.filter((n) => !n.parentId || !selectedIds.has(n.parentId))
    }

    const handleNodeDragStop: OnNodeDrag<NodeType> = useCallback(
        (_, __, draggedSelection) => {
            console.log('handleNodeDragStop', draggedSelection)
            setDraggingZoneIDs([])
            setTemporarilyUnlockedZoneIDs([])
            if (readOnly) return
            const allNodes = reactFlow.getNodes()
            if (draggedSelection.length === 0 || allNodes.length === 0) return

            const nodeMap = buildNodeMap(allNodes)
            const topLevel = getTopLevelSelection(draggedSelection)
            // let changed = false

            let workingNodes: NodeType[] = [...allNodes]
            const addToZoneChildren = (zoneID: string, childID: string, kind: 'zone' | 'card') => {
                workingNodes = workingNodes.map((n) => {
                    if (n.id !== zoneID || n.type !== 'zoneNode') return n
                    const zoneData = n.data as { label: string; cardChildren: string[]; zoneChildren: string[] }
                    if (kind === 'zone') {
                        return {
                            ...n,
                            data: {
                                ...zoneData,
                                zoneChildren: Array.from(new Set([...zoneData.zoneChildren, childID])),
                            },
                        } as NodeType
                    }
                    return {
                        ...n,
                        data: { ...zoneData, cardChildren: Array.from(new Set([...zoneData.cardChildren, childID])) },
                    } as NodeType
                })
            }
            const removeFromZoneChildren = (zoneID: string, childID: string, kind: 'zone' | 'card') => {
                workingNodes = workingNodes.map((n) => {
                    if (n.id !== zoneID || n.type !== 'zoneNode') return n
                    const zoneData = n.data as { label: string; cardChildren: string[]; zoneChildren: string[] }
                    if (kind === 'zone') {
                        return {
                            ...n,
                            data: { ...zoneData, zoneChildren: zoneData.zoneChildren.filter((ID) => ID !== childID) },
                        } as NodeType
                    }
                    return {
                        ...n,
                        data: { ...zoneData, cardChildren: zoneData.cardChildren.filter((ID) => ID !== childID) },
                    } as NodeType
                })
            }

            let changed = false
            for (const node of topLevel) {
                const intersecting = reactFlow.getIntersectingNodes(node, true) as NodeType[]
                const intersectingZones = intersecting.filter((n) => n.type === 'zoneNode' && n.id !== node.id)

                let candidates = intersectingZones
                if (node.type === 'zoneNode') {
                    // prevent cycles
                    candidates = candidates.filter((c) => !isDescendant(nodeMap, node.id, c.id))
                }

                // choose candidate: deepest -> largest overlap -> top-left
                let targetParent: NodeType | undefined
                const wm = buildNodeMap(workingNodes)
                if (candidates.length > 0) {
                    const asRecord: Record<string, Node> = Object.fromEntries(workingNodes.map((n) => [n.id, n]))
                    const withDepth = candidates.map((c) => ({ c, d: getDepth(c, asRecord) }))
                    const maxDepth = Math.max(...withDepth.map((x) => x.d))
                    const pool = withDepth.filter((x) => x.d === maxDepth).map((x) => x.c)
                    if (pool.length === 1) targetParent = pool[0]
                    else {
                        const rNode = rectOf(node, wm)
                        let bestArea = -1
                        let best: NodeType[] = []
                        for (const c of pool) {
                            const area = overlapArea(rNode, rectOf(c, wm))
                            if (area > bestArea) {
                                bestArea = area
                                best = [c]
                            } else if (area === bestArea) {
                                best.push(c)
                            }
                        }
                        if (best.length === 1) targetParent = best[0]
                        else if (best.length > 1) {
                            best.sort((a, b) => {
                                const ra = rectOf(a, wm)
                                const rb = rectOf(b, wm)
                                if (ra.y !== rb.y) return ra.y - rb.y
                                return ra.x - rb.x
                            })
                            targetParent = best[0]
                        }
                    }
                }
                const currentParentId = node.parentId
                const absPos = computeAbsolutePosition(node, wm)

                // unparent
                if (!targetParent && currentParentId) {
                    const rel = computeRelativePosition(absPos, undefined, wm)
                    // remove from old parent membership
                    workingNodes = workingNodes.map((n) =>
                        n.id === node.id ? { ...n, position: rel, parentId: undefined } : n,
                    )
                    if (node.type === 'zoneNode') removeFromZoneChildren(currentParentId, node.id, 'zone')
                    else removeFromZoneChildren(currentParentId, node.id, 'card')
                    changed = true
                    continue
                }

                // newly parented or reparented
                if (targetParent && targetParent.id !== currentParentId) {
                    const rel = computeRelativePosition(absPos, targetParent.id, wm)
                    workingNodes = workingNodes.map((n) =>
                        n.id === node.id ? { ...n, position: rel, parentId: targetParent.id } : n,
                    )
                    if (currentParentId) {
                        if (node.type === 'zoneNode') removeFromZoneChildren(currentParentId, node.id, 'zone')
                        else removeFromZoneChildren(currentParentId, node.id, 'card')
                    }
                    if (node.type === 'zoneNode') addToZoneChildren(targetParent.id, node.id, 'zone')
                    else addToZoneChildren(targetParent.id, node.id, 'card')
                    changed = true
                    continue
                }
            }

            // Only update nodes if something actually changed
            if (changed) {
                const finalNodes = sortNodesByNesting(workingNodes)
                reactFlow.setNodes(finalNodes)
            }
        },
        [reactFlow, readOnly],
    )

    const handleNodesChange = useCallback(
        (changes: NodeChange<NodeType>[]) => {
            if (changes.length === 0) return
            reactFlow.setNodes((currentNodes) => {
                if (currentNodes.length === 0) return currentNodes

                const nodeMap = new Map<string, NodeType>(currentNodes.map((node) => [node.id, cloneDeep(node)]))
                const changeApplied = applyChangesToNodeMap(nodeMap, changes)

                const zonesToAdjust = new Set<string>()
                for (const change of changes) {
                    const nodeId = 'id' in change ? change.id : undefined
                    if (!nodeId) continue
                    const node = nodeMap.get(nodeId)
                    if (!node) continue
                    if (node.type === 'zoneNode') {
                        zonesToAdjust.add(node.id)
                    }
                    const ancestors = collectZoneAncestors(node.id, nodeMap)
                    ancestors.forEach((ancestorId) => zonesToAdjust.add(ancestorId))
                }

                if (zonesToAdjust.size === 0 && !changeApplied) {
                    return currentNodes
                }

                const allNodesRecord = Object.fromEntries(nodeMap)
                const orderedZones = Array.from(zonesToAdjust).sort((a, b) => {
                    const zoneA = nodeMap.get(a)
                    const zoneB = nodeMap.get(b)
                    if (!zoneA || !zoneB) return 0
                    return getDepth(zoneB, allNodesRecord) - getDepth(zoneA, allNodesRecord)
                })

                let mutated = false
                orderedZones.forEach((zoneId) => {
                    if (expandZoneToFitChildren(zoneId, nodeMap)) {
                        mutated = true
                    }
                })

                if (!mutated && !changeApplied) {
                    return currentNodes
                }

                return currentNodes.map((node) => nodeMap.get(node.id) ?? node)
            })
        },
        [reactFlow],
    )

    return (
        <MTGDeckCreatorFlowContext.Provider
            value={{
                draggingZoneIDs,
                setDraggingZoneIDs,
                temporarilyUnlockedZoneIDs,
                readOnly,
                setReadOnly,
                isDirty,
                setIsDirty,
                onAddZone,
                handleNodeDragStart,
                handlePaneClick,
                handleNodeDragStop,
                handleNodesChange,
            }}
        >
            {children}
        </MTGDeckCreatorFlowContext.Provider>
    )
}
