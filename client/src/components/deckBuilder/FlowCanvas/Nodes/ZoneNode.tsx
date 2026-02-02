import { Box } from '@mui/material'
import { Node, NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import { useMTGDeckCreatorLogic } from '../../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckFlowCreator } from '../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'

export const MIN_SIZE = 180

export type ZoneNodeData = {
    label: string
    cardChildren: string[]
    zoneChildren: string[]
}

export type ZoneNodeProps = NodeProps & {
    data: ZoneNodeData
}

export const ZoneNode = (props: ZoneNodeProps) => {
    const { data, id, selected } = props
    const { label, cardChildren, zoneChildren } = data
    const { setDeck } = useMTGDeckCreatorLogic()
    const { draggingZoneIDs, temporarilyUnlockedZoneIDs } = useMTGDeckFlowCreator()
    const [lockedChildren, setLockedChildren] = useState(true)
    const [zoneName, setZoneName] = useState(label)
    const reactFlow = useReactFlow()

    useEffect(() => {
        setZoneName(label)
    }, [label])
    const CARD_WIDTH = 100
    const CARD_HEIGHT = 140
    const CARD_MARGIN = 8
    const MAX_COLS = 5

    const applyExtentToChildren = useCallback(
        (locked: boolean) => {
            reactFlow.setNodes((nodes) =>
                nodes.map((node) => {
                    if (cardChildren.includes(node.id)) {
                        const nextExtent = locked ? ('parent' as const) : undefined
                        if (node.extent === nextExtent && node.expandParent === locked) return node
                        return { ...node, extent: nextExtent, expandParent: locked }
                    }
                    if (zoneChildren.includes(node.id)) {
                        const enforceLock = locked && !temporarilyUnlockedZoneIDs.includes(node.id)
                        const nextExtent = enforceLock ? ('parent' as const) : undefined
                        if (node.extent === nextExtent && node.expandParent === enforceLock) return node
                        return { ...node, extent: nextExtent, expandParent: enforceLock }
                    }
                    return node
                }),
            )
        },
        [cardChildren, zoneChildren, reactFlow, temporarilyUnlockedZoneIDs],
    )

    useEffect(() => {
        applyExtentToChildren(lockedChildren)
    }, [lockedChildren, applyExtentToChildren])

    const handleAutosort = () => {
        const allNodes = reactFlow.getNodes() as Node[]
        // Get all child nodes (cards and phantoms)
        const childNodes = allNodes.filter(
            (node) => cardChildren.includes(node.id) && (node.type === 'cardNode' || node.type === 'phantomNode'),
        )
        // Sort by name (cardNode: data.card.name, phantomNode: data.card.card.name)
        childNodes.sort((a, b) => {
            const getName = (node: Node): string => {
                const d = node.data as { card?: { name?: string; card?: { name?: string } } }
                if (d?.card?.name) return (d.card.name || '').toLowerCase()
                if (d?.card?.card?.name) return (d.card.card.name || '').toLowerCase()
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
            // If this is the zone node, resize it
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

    const handleLockedChildrenChange = useCallback(
        (evt: React.ChangeEvent<HTMLInputElement>) => {
            const nextLocked = evt.target.checked
            setLockedChildren(nextLocked)
            applyExtentToChildren(nextLocked)
        },
        [applyExtentToChildren],
    )

    // Placeholder rendering logic
    if (draggingZoneIDs.includes(id)) {
        // This is the zone node being dragged, render placeholder
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid black',
                    backgroundColor: '#f0f0f0',
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
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                        onBlur={() => {
                            const trimmed = zoneName.trim()
                            if (trimmed && trimmed !== label && setDeck) {
                                setDeck((prev) => {
                                    if (!prev) return prev
                                    return {
                                        ...prev,
                                        zones: prev.zones.map((z) =>
                                            z.ID === id ? { ...z, name: trimmed } : z,
                                        ),
                                    }
                                })
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur()
                            }
                        }}
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
                <NodeResizer isVisible={selected} minWidth={MIN_SIZE} minHeight={MIN_SIZE} />
            </Box>
        </>
    )
}
