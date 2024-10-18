import { Node, Rect, XYPosition } from '@xyflow/react'
import { SetStateAction } from 'react'
import { deepCopy } from './arrayFunctions'

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
export const sortNodesByNesting = (nodes: Node[]) => {
    // Create a deep copy of the nodes array to avoid mutation
    const nodesCopy = deepCopy(nodes)

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
    node: Node,
    getIntersectingNodes: (
        node:
            | Node
            | Rect
            | {
                  id: Node['id']
              },
        partially?: boolean,
        nodes?: Node[] | undefined,
    ) => Node[],
    nodes: Node[],
    setNodes: (value: SetStateAction<Node[]>) => void,
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
    // We also need to update the original group node's data to exclude the node's id from the childrenIDs array

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
