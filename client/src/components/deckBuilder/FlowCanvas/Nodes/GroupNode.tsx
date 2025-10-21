import { Box } from '@mui/material'
import { Node, NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import { useMTGDeckFlowCreator } from '../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'

export const MIN_SIZE = 180

export type GroupNodeData = {
    label: string
    cardChildren: string[]
    zoneChildren: string[]
}

export type GroupNodeProps = NodeProps & {
    data: GroupNodeData
}

export const GroupNode = (props: GroupNodeProps) => {
    const { data, id } = props
    const { label, cardChildren } = data
    const { draggingGroupId } = useMTGDeckFlowCreator()
    const [resizable, setResizable] = useState(false)
    const [lockedChildren, setLockedChildren] = useState(true)
    const reactFlow = useReactFlow()
    const CARD_WIDTH = 100
    const CARD_HEIGHT = 140
    const CARD_MARGIN = 8
    const MAX_COLS = 5

    useEffect(() => {
        const constraints = {
            extent: lockedChildren ? ('parent' as const) : undefined,
            expandParent: lockedChildren,
        }
        reactFlow.setNodes((nodes) => {
            return nodes.map((node) => {
                if (cardChildren.includes(node.id)) {
                    return { ...node, ...constraints }
                }
                return node
            })
        })
    }, [lockedChildren, cardChildren, reactFlow])

    const handleAutosort = () => {
        const allNodes = reactFlow.getNodes() as Node[]
        // Get all child nodes (cards and phantoms)
        const childNodes = allNodes.filter(
            (node) => cardChildren.includes(node.id) && (node.type === 'cardNode' || node.type === 'phantomNode'),
        )
        // Sort by name
        childNodes.sort((a, b) => {
            function hasCardCardName(data: unknown): data is { card: { card: { name: string } } } {
                if (typeof data === 'object' && data !== null && 'card' in data) {
                    const cardField = (data as { card: unknown }).card
                    if (typeof cardField === 'object' && cardField !== null && 'card' in cardField) {
                        const cardCardField = (cardField as { card: unknown }).card
                        if (typeof cardCardField === 'object' && cardCardField !== null && 'name' in cardCardField) {
                            return true
                        }
                    }
                }
                return false
            }
            function getName(node: Node) {
                if (hasCardCardName(node.data)) {
                    return (node.data.card.card.name || '').toLowerCase()
                }
                return ''
            }
            return getName(a).localeCompare(getName(b))
        })
        // Calculate new positions
        const newNodes = allNodes.map((node) => {
            const idx = childNodes.findIndex((n) => n.id === node.id)
            if (idx !== -1) {
                const col = idx % MAX_COLS
                const row = Math.floor(idx / MAX_COLS)
                return {
                    ...node,
                    position: {
                        x: col * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN,
                        y: row * (CARD_HEIGHT + CARD_MARGIN) + CARD_MARGIN * 2,
                    },
                }
            }
            // If this is the group node, resize it
            if (node.id === id) {
                const cols = Math.min(childNodes.length, MAX_COLS)
                const rows = Math.ceil(childNodes.length / MAX_COLS)
                return {
                    ...node,
                    width: cols * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN * 2,
                    height: rows * (CARD_HEIGHT + CARD_MARGIN) + CARD_MARGIN * 2 + 60,
                }
            }
            return node
        })
        reactFlow.setNodes(newNodes)
    }

    // Handlers
    const handleResizableChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        setResizable(evt.target.checked)
    }, [])

    const handleLockedChildrenChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        setLockedChildren(evt.target.checked)
    }, [])

    // Placeholder rendering logic
    if (draggingGroupId && id === draggingGroupId) {
        // This is the group node being dragged, render placeholder
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid black',
                    backgroundColor: '#f0f0f077',
                    borderRadius: 15,
                }}
            />
        )
    }

    return (
        <>
            <NodeToolbar position={Position.Top}>
                <div style={{ padding: 4 }}>
                    <input
                        type="text"
                        value={label}
                        style={{
                            width: '100%',
                            minWidth: 120,
                            fontSize: 16,
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            padding: '4px 8px',
                            background: 'white',
                            color: 'black',
                        }}
                    />
                </div>
            </NodeToolbar>
            <NodeToolbar position={Position.Right}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
                    <label>
                        <input type="checkbox" checked={resizable} onChange={handleResizableChange} />
                        resizable
                    </label>
                    <label>
                        <input type="checkbox" checked={lockedChildren} onChange={handleLockedChildrenChange} />
                        locked children
                    </label>
                    <button onClick={handleAutosort} style={{ marginBottom: 8 }}>
                        Autosort by Name
                    </button>
                </div>
            </NodeToolbar>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '15px',
                    border: '1px solid black',
                    backgroundColor: '#f0f0f077',
                    padding: '20px',
                    boxSizing: 'border-box',
                }}
            >
                <NodeResizer isVisible={resizable} minWidth={MIN_SIZE} minHeight={MIN_SIZE} />
            </Box>
        </>
    )
}
