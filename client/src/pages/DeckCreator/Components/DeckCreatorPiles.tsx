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
import { Box, Button, Typography } from '@mui/material'
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

// Define CardRow component outside or memoized if it doesn't depend on DeckCreatorPiles's direct state/props often
// For simplicity here, keeping it inside, but for optimization, it could be moved or memoized.
const CardRow = ({ index, style, data }: ListChildComponentProps<{ cards: MTG_Card[]; zoneId: string }>) => {
    const cardInPile = data.cards[index]
    if (!cardInPile) return null

    return (
        <Draggable draggableId={cardInPile.ID} index={index} key={cardInPile.ID}>
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
                    />
                </div>
            )}
        </Draggable>
    )
}

export const DeckCreatorPiles: React.FC<DeckCreatorPilesProps> = () => {
    const { deck, setDeck } = useMTGDeckCreator()
    const scrollableZonesContainerRef = useRef<HTMLDivElement | null>(null)
    const [listHeight, setListHeight] = useState(300)

    const updateHeight = useCallback(() => {
        if (scrollableZonesContainerRef.current) {
            const newHeight = scrollableZonesContainerRef.current.clientHeight
            // Ensure a minimum height for FixedSizeList, adjust 50 based on your layout needs (e.g., header height)
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

        const currentRef = scrollableZonesContainerRef.current
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

    const allCategorizedCardIds = new Set<string>()
    actualZones.forEach((zone) => {
        zone.childrenIDs.forEach((id) => allCategorizedCardIds.add(id))
    })

    const finalUncategorizedCards = deckCardEntries
        .map((dc) => dc.card)
        .filter((card) => !allCategorizedCardIds.has(card.ID))

    const uncategorizedZoneDisplayData = {
        ID: 'uncategorized',
        name: 'Uncategorized',
        childrenIDs: finalUncategorizedCards.map((c) => c.ID),
        cards: finalUncategorizedCards, // Pass the direct card objects for rendering
    }

    const handleAddZone = () => {
        const zoneName = prompt('Enter name for the new zone:')
        if (zoneName && deck) {
            const newZoneToAdd: FlowZone = {
                ID: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                name: zoneName,
                childrenIDs: [],
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

            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck

                const newActualZones = [...prevDeck.zones]

                const sourceIsUncategorized = source.droppableId === 'uncategorized'
                const destinationIsUncategorized = destination.droppableId === 'uncategorized'

                // Card Removal from Source
                if (!sourceIsUncategorized) {
                    const sourceZoneIndex = newActualZones.findIndex((z) => z.ID === source.droppableId)
                    if (sourceZoneIndex !== -1) {
                        const sourceChildren = [...newActualZones[sourceZoneIndex].childrenIDs]
                        sourceChildren.splice(source.index, 1)
                        newActualZones[sourceZoneIndex] = {
                            ...newActualZones[sourceZoneIndex],
                            childrenIDs: sourceChildren,
                        }
                    } else {
                        console.error('RBD: Source zone not found in actual zones', source.droppableId)
                        return prevDeck
                    }
                }
                // If source is uncategorized, removal is implicit if it moves to an actual zone.

                // Card Addition to Destination
                if (!destinationIsUncategorized) {
                    const destZoneIndex = newActualZones.findIndex((z) => z.ID === destination.droppableId)
                    if (destZoneIndex !== -1) {
                        const destChildren = [...newActualZones[destZoneIndex].childrenIDs]
                        destChildren.splice(destination.index, 0, draggableId)
                        newActualZones[destZoneIndex] = { ...newActualZones[destZoneIndex], childrenIDs: destChildren }
                    } else {
                        console.error('RBD: Destination zone not found in actual zones', destination.droppableId)
                        return prevDeck
                    }
                }
                // If destination is uncategorized, addition is implicit: it was removed from an actual zone (if applicable)
                // and will now be part of the derived uncategorized list.

                // Reordering within Uncategorized: Current model doesn't persist this specific ordering
                // as 'finalUncategorizedCards' is derived based on presence in actualZones.
                // A visual reorder might happen temporarily, but data won't reflect it unless 'deckCardEntries' order changes.
                if (sourceIsUncategorized && destinationIsUncategorized) {
                    console.log(
                        "Attempted to reorder cards within Uncategorized. This view doesn't persist such specific ordering.",
                    )
                    // To support this, one might need to manage an explicit order for uncategorized items
                    // or modify how finalUncategorizedCards are derived/sorted.
                    // For now, no change to newActualZones is made for this specific sub-case.
                }

                return { ...prevDeck, zones: newActualZones }
            })
        }
    }

    console.log('[DeckCreatorPiles] About to render. List height:', listHeight)

    const renderZoneColumn = (
        zoneData: { ID: string; name: string; childrenIDs: string[]; cards?: MTG_Card[] },
        isUncategorized: boolean,
        draggableProvided?: DraggableProvided, // For making the column itself draggable
    ) => {
        const cardsToRenderInZone =
            isUncategorized && zoneData.cards
                ? zoneData.cards // Use pre-calculated for uncategorized
                : zoneData.childrenIDs
                      .map((id) => allDeckCardsMap.get(id))
                      .filter((card): card is MTG_Card => card !== undefined)

        // console.log(`[DeckCreatorPiles] Rendering column ${zoneData.name}, cards: ${cardsToRenderInZone.length}, list height: ${listHeight}`);

        return (
            <Box
                ref={draggableProvided?.innerRef} // Ref for the draggable column itself
                {...draggableProvided?.draggableProps} // Props for the draggable column
                sx={{
                    minWidth: '220px', // Slightly wider to accommodate scrollbar + padding
                    width: '220px',
                    height: '100%', // Column takes full available height
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid lightgray',
                    borderRadius: '4px',
                    backgroundColor: 'white', // Ensure background for columns
                    flexShrink: 0, // Important for items in a flex container, esp. uncategorized
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        p: 1,
                        backgroundColor: 'grey.200',
                        textAlign: 'center',
                        cursor: draggableProvided ? 'grab' : 'default', // Visual cue for draggability
                        borderBottom: '1px solid lightgray',
                    }}
                    {...draggableProvided?.dragHandleProps} // Drag handle for the column
                >
                    {zoneData.name}
                </Typography>
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
                                    width: 200,
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
                                    itemData={{ cards: cardsToRenderInZone, zoneId: zoneData.ID }}
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
            <Box sx={{ display: 'flex', height: '100%', p: 1, gap: 2, overflow: 'hidden' }}>
                {' '}
                {/* Parent flex container, controls overall height and prevents its own scroll */}
                {/* Uncategorized Column (Fixed) */}
                {renderZoneColumn(uncategorizedZoneDisplayData, true, undefined)}
                {/* Scrollable Container for Actual Zones */}
                <Droppable droppableId="all-deck-zones" type="COLUMN" direction="horizontal">
                    {(providedDrop: DroppableProvided, _snapshotDrop: DroppableStateSnapshot) => (
                        <Box
                            ref={(el: HTMLDivElement | null) => {
                                providedDrop.innerRef(el)
                                scrollableZonesContainerRef.current = el
                            }}
                            {...providedDrop.droppableProps}
                            sx={{
                                display: 'flex',
                                flexGrow: 1, // Allows this container to take available space
                                overflowX: 'auto', // Horizontal scroll for zones
                                minWidth: 0, // Important for flex item that needs to scroll
                                overflowY: 'hidden', // Prevent vertical scroll on this container itself
                                height: '100%', // Fill parent's height
                                gap: 2, // Gap between draggable zone columns
                                // backgroundColor: snapshotDrop.isDraggingOver ? 'lightgreen' : 'transparent', // Optional: visual feedback for column drop area
                            }}
                        >
                            {actualZones.map((zone, index) => (
                                <Draggable key={zone.ID} draggableId={zone.ID} index={index}>
                                    {(
                                        providedDraggable: DraggableProvided,
                                        _snapshotDraggable: DraggableStateSnapshot,
                                    ) =>
                                        // Pass actual zone data, isUncategorized=false, and draggable props
                                        renderZoneColumn(zone, false, providedDraggable)
                                    }
                                </Draggable>
                            ))}
                            {providedDrop.placeholder}
                        </Box>
                    )}
                </Droppable>
                {/* Add Zone Button (Fixed part of the main flex layout) */}
                <Box
                    sx={{
                        minWidth: '150px',
                        width: '150px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        p: 1,
                        flexShrink: 0, // Prevent shrinking
                    }}
                >
                    <Button variant="outlined" onClick={handleAddZone} fullWidth>
                        + Add Zone
                    </Button>
                </Box>
            </Box>
        </DragDropContext>
    )
}
