import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DraggableStateSnapshot,
    DropResult,
    Droppable,
    DroppableProvided,
    DroppableStateSnapshot,
} from '@hello-pangea/dnd'
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { Box, Button, IconButton, Typography, useMediaQuery } from '@mui/material'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FixedSizeList, ListChildComponentProps } from 'react-window'
import { MTGCardWithHover } from '../../../components/MTGCardWithHover'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { FlowZone, MTG_Card } from '../../../graphql/types'
import { CARD_SIZE_VALUES } from '../../../utils/constants'

interface DeckCreatorPilesProps {}

// Assuming a margin of 0.5 for sx={{my: 0.5}} translates to 4px top + 4px bottom = 8px total vertical space per item
// Adjust this if your theme's spacing unit is different or MTGCardWithHover has internal margins/paddings affecting its full rendered height.
const CARD_ITEM_VERTICAL_SPACE = CARD_SIZE_VALUES['small'].height + 8
const DESKTOP_COLUMN_WIDTH = '220px'
const MOBILE_COLUMN_WIDTH = '180px' // Or adjust as needed

// Update CardRowData interface
interface CardRowData {
    cards: MTG_Card[]
    zoneId: string
}

// Define CardRow component outside or memoized if it doesn't depend on DeckCreatorPiles's direct state/props often
// For simplicity here, keeping it inside, but for optimization, it could be moved or memoized.
const CardRow = ({ index, style, data }: ListChildComponentProps<CardRowData>) => {
    const cardInPile = data.cards[index]
    if (!cardInPile) return null

    return (
        <Draggable draggableId={cardInPile.ID} index={index} key={cardInPile.ID} shouldRespectForcePress={true}>
            {(providedDraggable: DraggableProvided, snapshotDraggable: DraggableStateSnapshot) => (
                <div
                    ref={providedDraggable.innerRef}
                    {...providedDraggable.draggableProps}
                    {...providedDraggable.dragHandleProps}
                    style={{
                        ...providedDraggable.draggableProps.style,
                        ...style,
                        userSelect: 'none',
                        opacity: snapshotDraggable.isDragging ? 0.8 : 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <MTGCardWithHover
                        data={{ type: 'card', card: cardInPile }}
                        hideHover={snapshotDraggable.isDragging}
                        forceSize="small"
                    />
                </div>
            )}
        </Draggable>
    )
}

export const DeckCreatorPiles: React.FC<DeckCreatorPilesProps> = () => {
    const { deck, setDeck } = useMTGDeckCreator()
    const isMobile = useMediaQuery('(max-width: 600px)')
    const pilesAreaRef = useRef<HTMLDivElement | null>(null)
    const [listHeight, setListHeight] = useState(300)
    const [sessionUncategorizedCardIds, setSessionUncategorizedCardIds] = useState<string[]>([])

    // Effect to initialize and reconcile sessionUncategorizedCardIds
    useEffect(() => {
        if (!deck) return
        const { cards: deckCardEntries, zones: actualZones } = deck

        const allCategorizedIdsInEffect = new Set<string>()
        actualZones.forEach((zone) => {
            zone.cardChildren.forEach((id) => allCategorizedIdsInEffect.add(id))
        })
        const currentActualUncategorizedCards = deckCardEntries
            .map((dc) => dc.card)
            .filter((card) => !allCategorizedIdsInEffect.has(card.ID))
        const currentActualUncategorizedIds = currentActualUncategorizedCards.map((c) => c.ID)

        setSessionUncategorizedCardIds((prevOrder) => {
            const newOrderSet = new Set(currentActualUncategorizedIds)

            // 1. Filter prevOrder to keep only IDs that are still genuinely uncategorized, preserving their order.
            const stillUncategorizedAndOrdered = prevOrder.filter((id) => newOrderSet.has(id))

            // 2. Find IDs that are in currentActualUncategorizedIds but not yet in stillUncategorizedAndOrdered.
            // These are newly uncategorized cards or those whose status needs re-confirmation.
            const newlyConfirmedUncategorized = currentActualUncategorizedIds.filter(
                (id) => !stillUncategorizedAndOrdered.includes(id),
            )

            // 3. Concatenate: ordered and still uncategorized first, then new ones.
            return [...stillUncategorizedAndOrdered, ...newlyConfirmedUncategorized]
        })
    }, [deck, setSessionUncategorizedCardIds]) // Simplified dependencies, as deckCardEntries and actualZones are derived from deck

    const updateHeight = useCallback(() => {
        if (pilesAreaRef.current) {
            const newHeight = pilesAreaRef.current.clientHeight
            // Subtract approx title height for each column from the available space for the list
            setListHeight(newHeight > 50 ? newHeight - 48 : 250) // Subtract approx. header height, ensure min
        } else {
            setListHeight(250) // Default if ref not available early
        }
    }, [])

    useEffect(() => {
        updateHeight() // Initial height calculation

        const resizeObserver = new ResizeObserver(() => {
            updateHeight()
        })

        const currentRef = pilesAreaRef.current
        if (currentRef) {
            resizeObserver.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                resizeObserver.unobserve(currentRef)
            }
            resizeObserver.disconnect()
        }
    }, [updateHeight])

    if (!deck) {
        console.log('[DeckCreatorPiles] No deck, rendering loading state.')
        return <Typography>Loading deck...</Typography>
    }

    const { cards: deckCardEntries, zones: actualZones } = deck
    console.log(
        '[DeckCreatorPiles] Deck loaded. Entries:',
        deckCardEntries?.length,
        'Actual Zones:',
        actualZones?.length,
    )

    const allDeckCardsMap = new Map(deckCardEntries.map((dc) => [dc.card.ID, dc.card]))

    const uncategorizedZoneDisplayData = {
        ID: 'uncategorized',
        name: 'Uncategorized',
        cardChildren: sessionUncategorizedCardIds, // Use state here
        zoneChildren: [],
        get cards() {
            // Use a getter to derive cards based on current sessionUncategorizedCardIds
            return this.cardChildren
                .map((id) => allDeckCardsMap.get(id))
                .filter((card): card is MTG_Card => card !== undefined)
        },
    }

    const handleAddZone = () => {
        const zoneName = prompt('Enter name for the new zone:')
        if (zoneName && deck) {
            const newZoneToAdd: FlowZone = {
                ID: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                name: zoneName,
                cardChildren: [],
                zoneChildren: [],
                position: { x: 0, y: 0 }, // Default position, might not be used in this view
                width: 200, // Default width, might not be used in this view
                height: 300, // Default height, might not be used in this view
            }
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck
                return {
                    ...prevDeck,
                    zones: [...prevDeck.zones, newZoneToAdd],
                }
            })
        }
    }

    const handleRenameZone = (zoneId: string) => {
        const currentZone = actualZones.find((z) => z.ID === zoneId)
        const newName = prompt('Enter new name for the zone:', currentZone?.name || '')
        if (newName && newName.trim() !== '' && deck) {
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck
                return {
                    ...prevDeck,
                    zones: prevDeck.zones.map((zone) => (zone.ID === zoneId ? { ...zone, name: newName } : zone)),
                }
            })
        }
    }

    const handleDeleteZone = (zoneId: string) => {
        if (window.confirm('Are you sure you want to delete this zone? Cards will become uncategorized.')) {
            if (deck) {
                setDeck((prevDeck) => {
                    if (!prevDeck) return prevDeck
                    return {
                        ...prevDeck,
                        zones: prevDeck.zones.filter((zone) => zone.ID !== zoneId),
                    }
                })
            }
        }
    }

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId, type } = result

        if (!destination) return

        if (type === 'COLUMN') {
            // Prevent dropping in the same position
            if (source.index === destination.index) return

            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck
                const newActualZones = Array.from(prevDeck.zones)
                const [movedZone] = newActualZones.splice(source.index, 1)
                newActualZones.splice(destination.index, 0, movedZone)
                return { ...prevDeck, zones: newActualZones }
            })
            return
        }

        if (type === 'CARD_LIST') {
            // Prevent dropping in the same place
            if (destination.droppableId === source.droppableId && destination.index === source.index) {
                return
            }

            // Optimistic updates to sessionUncategorizedCardIds before setDeck
            if (source.droppableId === 'uncategorized' && destination.droppableId === 'uncategorized') {
                setSessionUncategorizedCardIds((prevOrder) => {
                    const newOrder = Array.from(prevOrder)
                    const [movedId] = newOrder.splice(source.index, 1)
                    newOrder.splice(destination.index, 0, movedId)
                    return newOrder
                })
            } else if (destination.droppableId === 'uncategorized') {
                // Moving TO Uncategorized
                setSessionUncategorizedCardIds((prevOrder) => {
                    const newOrder = prevOrder.filter((id) => id !== draggableId) // Remove if already present (e.g. from quick back-and-forth)
                    newOrder.splice(destination.index, 0, draggableId)
                    return newOrder
                })
            } else if (source.droppableId === 'uncategorized') {
                // Moving FROM Uncategorized
                setSessionUncategorizedCardIds((prevOrder) => prevOrder.filter((id) => id !== draggableId))
            }

            // Update deck state (actual zones)
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck
                const newActualZones = [...prevDeck.zones]

                // Card Removal from Source Zone (if not uncategorized initially)
                if (source.droppableId !== 'uncategorized') {
                    const sourceZoneIndex = newActualZones.findIndex((z) => z.ID === source.droppableId)
                    if (sourceZoneIndex !== -1) {
                        const sourceChildren = [...newActualZones[sourceZoneIndex].cardChildren]
                        sourceChildren.splice(source.index, 1)
                        newActualZones[sourceZoneIndex] = {
                            ...newActualZones[sourceZoneIndex],
                            cardChildren: sourceChildren,
                        }
                    } else {
                        console.error('RBD: Source zone not found in actual zones', source.droppableId)
                        return prevDeck // Should not happen if optimistic update for uncategorized worked
                    }
                }

                // Card Addition to Destination Zone (if not uncategorized finally)
                if (destination.droppableId !== 'uncategorized') {
                    const destZoneIndex = newActualZones.findIndex((z) => z.ID === destination.droppableId)
                    if (destZoneIndex !== -1) {
                        const destChildren = [...newActualZones[destZoneIndex].cardChildren]
                        destChildren.splice(destination.index, 0, draggableId)
                        newActualZones[destZoneIndex] = { ...newActualZones[destZoneIndex], cardChildren: destChildren }
                    } else {
                        console.error('RBD: Destination zone not found in actual zones', destination.droppableId)
                        return prevDeck // Should not happen if optimistic update for uncategorized worked
                    }
                }
                return { ...prevDeck, zones: newActualZones }
            })
        }
    }

    console.log('[DeckCreatorPiles] About to render. List height:', listHeight)

    const renderZoneColumn = (
        zoneData: {
            ID: string
            name: string
            cardChildren: string[]
            zoneChildren: string[]
            cards?: MTG_Card[] | (() => MTG_Card[])
        },
        isUncategorized: boolean,
        draggableProvided?: DraggableProvided,
    ) => {
        const cardsToRenderInZone =
            isUncategorized && typeof zoneData.cards === 'function'
                ? zoneData.cards()
                : zoneData.cardChildren
                      .map((id) => allDeckCardsMap.get(id))
                      .filter((card): card is MTG_Card => card !== undefined)

        const columnWidth = isMobile ? MOBILE_COLUMN_WIDTH : DESKTOP_COLUMN_WIDTH

        return (
            <Box
                ref={draggableProvided?.innerRef} // Ref for the draggable column itself
                {...draggableProvided?.draggableProps} // Props for the draggable column
                sx={{
                    minWidth: columnWidth, // Use responsive width
                    width: columnWidth, // Use responsive width
                    height: '100%', // Column takes full available height
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid lightgray',
                    borderRadius: '4px',
                    backgroundColor: 'white', // Ensure background for columns
                    flexShrink: 0, // Important for items in a flex container, esp. uncategorized
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between', // To space out title and icons
                        p: 1,
                        backgroundColor: 'grey.200',
                        borderBottom: '1px solid lightgray',
                    }}
                    {...draggableProvided?.dragHandleProps} // Apply drag handle to the whole header Box
                >
                    <Typography
                        variant="h6"
                        sx={{
                            textAlign: 'center',
                            flexGrow: 1, // Allow title to take space
                            cursor: draggableProvided ? 'grab' : 'default',
                            fontSize: isMobile ? '0.9rem' : '1.25rem', // Slightly smaller title on mobile
                        }}
                    >
                        {zoneData.name}
                    </Typography>
                    {!isUncategorized && (
                        <Box sx={{ display: 'flex' }}>
                            {' '}
                            {/* Container for icons */}
                            <IconButton size="small" onClick={() => handleRenameZone(zoneData.ID)}>
                                <EditIcon fontSize={isMobile ? 'small' : 'inherit'} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteZone(zoneData.ID)}>
                                <DeleteIcon fontSize={isMobile ? 'small' : 'inherit'} />
                            </IconButton>
                        </Box>
                    )}
                </Box>
                <Droppable
                    droppableId={zoneData.ID}
                    key={zoneData.ID} // Keep key here for the Droppable list context
                    type="CARD_LIST"
                    mode="virtual"
                    renderClone={(provided, _snapshot, rubric) => {
                        const card = allDeckCardsMap.get(rubric.draggableId)
                        if (!card) return null
                        return (
                            <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                    backgroundColor: 'transparent',
                                    width: isMobile
                                        ? parseInt(MOBILE_COLUMN_WIDTH) - 20
                                        : parseInt(DESKTOP_COLUMN_WIDTH) - 20, // Adjust clone width based on column
                                    height: CARD_SIZE_VALUES['small'].height,
                                    userSelect: 'none',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <MTGCardWithHover
                                    data={{ type: 'card', card: card }}
                                    hideHover={true}
                                    forceSize="small"
                                />
                            </Box>
                        )
                    }}
                >
                    {(providedList: DroppableProvided, snapshotList: DroppableStateSnapshot) => (
                        <Box
                            // No ref here; FixedSizeList's outerRef uses providedList.innerRef
                            {...providedList.droppableProps}
                            sx={{
                                flexGrow: 1, // List area takes remaining space in the column
                                width: '100%',
                                overflow: 'hidden', // Critical for FixedSizeList's height calculation
                                backgroundColor: snapshotList.isDraggingOver ? 'lightblue' : 'transparent',
                                transition: 'background-color 0.2s ease',
                                // Add padding inside if needed, or handle spacing via itemSize
                            }}
                        >
                            {cardsToRenderInZone.length > 0 ? (
                                <FixedSizeList
                                    height={listHeight} // Dynamic height from state
                                    itemCount={cardsToRenderInZone.length}
                                    itemSize={CARD_ITEM_VERTICAL_SPACE}
                                    width="100%"
                                    outerRef={providedList.innerRef} // Connects Droppable to FixedSizeList scroll parent
                                    itemData={{
                                        cards: cardsToRenderInZone,
                                        zoneId: zoneData.ID,
                                    }}
                                >
                                    {CardRow}
                                </FixedSizeList>
                            ) : (
                                <Box
                                    ref={providedList.innerRef} // Important: Attach ref even when empty for dnd
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        p: 1, // Padding for the empty message
                                    }}
                                >
                                    {!snapshotList.isDraggingOver && (
                                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                            Drop cards here
                                        </Typography>
                                    )}
                                </Box>
                            )}
                            {providedList.placeholder}
                        </Box>
                    )}
                </Droppable>
            </Box>
        )
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1, gap: 1, overflow: 'hidden' }}>
                {/* Add Zone Button Area */}
                <Box
                    sx={{
                        py: 1, // Padding top and bottom
                        display: 'flex',
                        justifyContent: isMobile ? 'stretch' : 'center', // Stretch on mobile, center on desktop
                        alignItems: 'center',
                        flexShrink: 0, // Prevent this box from shrinking
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={handleAddZone}
                        fullWidth={isMobile} // Full width on mobile
                        sx={{ maxWidth: isMobile ? '100%' : '300px' }} // Max width for desktop to prevent overstretching
                    >
                        + Add Zone
                    </Button>
                </Box>

                {/* Piles Area (Uncategorized and Actual Zones) */}
                <Box
                    ref={pilesAreaRef} // Assign ref here to the container of all piles
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexGrow: 1, // Takes remaining vertical space
                        gap: isMobile ? 1 : 2,
                        overflow: 'hidden', // Parent for horizontal scroll area needs this
                    }}
                >
                    {renderZoneColumn(uncategorizedZoneDisplayData, true, undefined)}
                    <Droppable droppableId="all-deck-zones" type="COLUMN" direction="horizontal">
                        {(providedDrop: DroppableProvided, _snapshotDrop: DroppableStateSnapshot) => (
                            <Box
                                ref={providedDrop.innerRef} // scrollableZonesContainerRef removed, this is the direct droppable now
                                {...providedDrop.droppableProps}
                                sx={{
                                    display: 'flex',
                                    flexGrow: 1,
                                    overflowX: 'auto',
                                    minWidth: 0,
                                    overflowY: 'hidden',
                                    height: '100%',
                                    gap: isMobile ? 1 : 2,
                                }}
                            >
                                {actualZones.map((zone, index) => (
                                    <Draggable key={zone.ID} draggableId={zone.ID} index={index}>
                                        {(
                                            providedDraggable: DraggableProvided,
                                            _snapshotDraggable: DraggableStateSnapshot,
                                        ) => renderZoneColumn(zone, false, providedDraggable)}
                                    </Draggable>
                                ))}
                                {providedDrop.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </Box>
            </Box>
        </DragDropContext>
    )
}
