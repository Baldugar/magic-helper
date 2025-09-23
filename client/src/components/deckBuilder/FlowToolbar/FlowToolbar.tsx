import { CenterFocusStrong, Delete, IosShare, Lock, PanTool, Sort } from '@mui/icons-material'
import { Box, Button, Paper, Stack, Switch, Tooltip, Typography } from '@mui/material'
import { Node, useReactFlow, useStore } from '@xyflow/react'

import { ChangeEvent, useCallback } from 'react'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import {
    NodeType,
    calculateCardsFromNodes,
    calculateZonesFromNodes,
    sortNodesByNesting,
} from '../../../utils/functions/nodeFunctions'
import { CardNodeData } from '../FlowCanvas/Nodes/CardNode'
import { GroupNodeData, MIN_SIZE } from '../FlowCanvas/Nodes/GroupNode'
import { PhantomNodeData } from '../FlowCanvas/Nodes/PhantomNode'

const CARD_WIDTH = 100
const CARD_HEIGHT = 140
const CARD_MARGIN = 12
const MAX_CARD_COLUMNS = 5
const ZONE_GAP_X = 40
const ZONE_GAP_Y = 40
const ZONE_COLUMNS = 3
const UNGROUPED_COLUMNS = 6

const getCardName = (node: NodeType) => {
    if (node.type === 'cardNode') {
        const data = node.data as CardNodeData
        return data.card.card.name ?? ''
    }
    if (node.type === 'phantomNode') {
        const data = node.data as PhantomNodeData
        return data.card.card.name ?? ''
    }
    return ''
}

const cloneNode = (node: NodeType): NodeType => ({
    ...node,
    data: { ...node.data },
})

export const FlowToolbar = () => {
    const { setNodes, getNodes, fitView } = useReactFlow<NodeType>()
    const selectedCount = useStore((state) => state.nodes.filter((node) => node.selected).length)
    const { setDeck, setOpenExportDialog } = useMTGDeckCreator()
    const { readOnly, setReadOnly, moveMode, setMoveMode } = useMTGDeckFlowCreator()

    const syncDeckWithNodes = useCallback(
        (nodes: NodeType[]) => {
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck
                const nodeArray = nodes as unknown as Node[]
                const cardInputs = calculateCardsFromNodes(nodeArray, prevDeck.cards)
                const zones = calculateZonesFromNodes(nodeArray)
                const deckCardMap = new Map(prevDeck.cards.map((deckCard) => [deckCard.card.ID, deckCard]))
                const updatedCards = cardInputs
                    .map((input) => {
                        const existing = deckCardMap.get(input.card)
                        if (!existing) {
                            return undefined
                        }
                        return {
                            ...existing,
                            count: input.count,
                            position: input.position,
                            phantoms: input.phantoms.map((phantom) => ({ ...phantom })),
                            selectedVersionID: input.selectedVersionID,
                            deckCardType: input.deckCardType,
                            mainOrSide: input.mainOrSide,
                        }
                    })
                    .filter(Boolean) as typeof prevDeck.cards
                return {
                    ...prevDeck,
                    cards: updatedCards,
                    zones,
                }
            })
        },
        [setDeck],
    )

    const handleAutosort = useCallback(() => {
        if (readOnly) return
        const currentNodes = getNodes()
        if (currentNodes.length === 0) return

        const clonedNodes = currentNodes.map(cloneNode)
        const zoneNodes = clonedNodes.filter((node) => node.type === 'groupNode')
        const zoneMap = new Map<string, NodeType>()
        zoneNodes.forEach((zone) => zoneMap.set(zone.id, zone))

        const childrenByZone = new Map<string, NodeType[]>()
        clonedNodes.forEach((node) => {
            if (node.parentId && zoneMap.has(node.parentId)) {
                const arr = childrenByZone.get(node.parentId) ?? []
                arr.push(node)
                childrenByZone.set(node.parentId, arr)
            }
        })

        zoneNodes.forEach((zone) => {
            const children = childrenByZone.get(zone.id) ?? []
            const cardChildren = children.filter((child) => child.type === 'cardNode')
            const phantomChildren = children.filter((child) => child.type === 'phantomNode')

            cardChildren.sort((a, b) => getCardName(a).localeCompare(getCardName(b)))
            phantomChildren.sort((a, b) => getCardName(a).localeCompare(getCardName(b)))

            let index = 0
            const orderedChildren = [...cardChildren, ...phantomChildren]
            orderedChildren.forEach((child) => {
                const col = index % MAX_CARD_COLUMNS
                const row = Math.floor(index / MAX_CARD_COLUMNS)
                child.position = {
                    x: col * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN,
                    y: row * (CARD_HEIGHT + CARD_MARGIN) + CARD_MARGIN,
                }
                index += 1
            })

            const totalItems = cardChildren.length + phantomChildren.length
            const cols = totalItems === 0 ? 1 : Math.min(MAX_CARD_COLUMNS, totalItems)
            const rows = totalItems === 0 ? 1 : Math.ceil(totalItems / MAX_CARD_COLUMNS)
            const width = Math.max(zone.width ?? MIN_SIZE, cols * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN * 2)
            const height = Math.max(zone.height ?? MIN_SIZE, rows * (CARD_HEIGHT + CARD_MARGIN) + CARD_MARGIN * 2 + 60)
            zone.width = width
            zone.height = height
        })

        const sortedZones = [...zoneNodes].sort((a, b) => {
            const labelA = (a.data as GroupNodeData).label ?? ''
            const labelB = (b.data as GroupNodeData).label ?? ''
            return labelA.localeCompare(labelB)
        })

        sortedZones.forEach((zone, index) => {
            const col = index % ZONE_COLUMNS
            const row = Math.floor(index / ZONE_COLUMNS)
            const width = zone.width ?? MIN_SIZE
            const height = zone.height ?? MIN_SIZE
            zone.position = {
                x: col * (width + ZONE_GAP_X),
                y: row * (height + ZONE_GAP_Y),
            }
        })

        const zoneBottom = sortedZones.length
            ? Math.max(...sortedZones.map((zone) => (zone.position?.y ?? 0) + (zone.height ?? MIN_SIZE)))
            : 0

        const freeCards = clonedNodes.filter((node) => node.type === 'cardNode' && !node.parentId)
        freeCards.sort((a, b) => getCardName(a).localeCompare(getCardName(b)))
        const freeBaseY = sortedZones.length ? zoneBottom + 80 : 0
        freeCards.forEach((node, index) => {
            const col = index % UNGROUPED_COLUMNS
            const row = Math.floor(index / UNGROUPED_COLUMNS)
            node.position = {
                x: col * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN,
                y: freeBaseY + row * (CARD_HEIGHT + CARD_MARGIN),
            }
        })

        const childrenMap = new Map<string, string[]>()
        clonedNodes.forEach((node) => {
            if (node.parentId) {
                const list = childrenMap.get(node.parentId) ?? []
                if (node.type === 'cardNode') {
                    list.push(node.id)
                    childrenMap.set(node.parentId, list)
                }
            }
        })

        const normalizedNodes = clonedNodes.map((node) => {
            if (node.type === 'groupNode') {
                const data = node.data as GroupNodeData
                return {
                    ...node,
                    data: {
                        ...data,
                        cardChildren: childrenMap.get(node.id) ?? [],
                    },
                }
            }
            return node
        })

        const sorted = sortNodesByNesting(normalizedNodes)
        setNodes(sorted)
        syncDeckWithNodes(sorted)
    }, [getNodes, readOnly, setNodes, syncDeckWithNodes])

    const handleDeleteSelected = useCallback(() => {
        if (readOnly) return
        const nodes = getNodes()
        const selected = nodes.filter((node) => node.selected)
        if (selected.length === 0) return

        const selectedZoneIds = new Set(selected.filter((node) => node.type === 'groupNode').map((node) => node.id))
        const selectedNodeIds = new Set(selected.map((node) => node.id))
        const zonePositions = new Map<string, { x: number; y: number }>()
        nodes.forEach((node) => {
            if (node.type === 'groupNode') {
                zonePositions.set(node.id, node.position)
            }
        })

        const filtered = nodes
            .filter((node) => !selectedNodeIds.has(node.id))
            .map((node) => {
                if (node.parentId && selectedZoneIds.has(node.parentId)) {
                    const zonePos = zonePositions.get(node.parentId) ?? { x: 0, y: 0 }
                    return {
                        ...node,
                        parentId: undefined,
                        position: {
                            x: node.position.x + zonePos.x,
                            y: node.position.y + zonePos.y,
                        },
                    }
                }
                return node
            })

        const childMap = new Map<string, string[]>()
        filtered.forEach((node) => {
            if (node.parentId) {
                if (node.type === 'cardNode') {
                    const list = childMap.get(node.parentId) ?? []
                    list.push(node.id)
                    childMap.set(node.parentId, list)
                }
            }
        })

        const normalized = filtered.map((node) => {
            if (node.type === 'groupNode') {
                const data = node.data as GroupNodeData
                return {
                    ...node,
                    data: {
                        ...data,
                        cardChildren: childMap.get(node.id) ?? [],
                    },
                }
            }
            return node
        })

        const sorted = sortNodesByNesting(normalized)
        setNodes(sorted)
        syncDeckWithNodes(sorted)
    }, [getNodes, readOnly, setNodes, syncDeckWithNodes])

    const handleExport = useCallback(() => {
        setOpenExportDialog(true)
    }, [setOpenExportDialog])

    const handleFitView = useCallback(() => {
        fitView({ padding: 0.2 })
    }, [fitView])

    const toggleReadOnly = (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setReadOnly(checked)
        if (checked) {
            setMoveMode(false)
        }
    }

    return (
        <Box position="absolute" top={72} right={16} zIndex={1200}>
            <Paper elevation={3} sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <span>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Sort />}
                            onClick={handleAutosort}
                            disabled={readOnly}
                        >
                            Autosort
                        </Button>
                    </span>
                    <Tooltip title="Eliminar nodos seleccionados">
                        <span>
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<Delete />}
                                onClick={handleDeleteSelected}
                                disabled={readOnly || selectedCount === 0}
                            >
                                Borrar
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Modo mover (arrastrar lienzo)">
                        <span>
                            <Button
                                variant={moveMode ? 'contained' : 'outlined'}
                                size="small"
                                startIcon={<PanTool />}
                                onClick={() => setMoveMode((prev) => !prev)}
                                disabled={readOnly}
                            >
                                Mover
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Ajustar vista al contenido">
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CenterFocusStrong />}
                                onClick={handleFitView}
                            >
                                Centrar
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Exportar mazo">
                        <span>
                            <Button variant="outlined" size="small" startIcon={<IosShare />} onClick={handleExport}>
                                Exportar
                            </Button>
                        </span>
                    </Tooltip>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                        <Lock fontSize="small" color={readOnly ? 'action' : 'disabled'} />
                        <Switch checked={readOnly} onChange={toggleReadOnly} size="small" />
                        <Typography variant="caption">Read-only</Typography>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    )
}
