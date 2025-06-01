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
import React from 'react'
import { MTGCardWithHover } from '../../../components/MTGCardWithHover'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { FlowZone, MTG_Card } from '../../../graphql/types'

interface DeckCreatorPilesProps {}

export const DeckCreatorPiles: React.FC<DeckCreatorPilesProps> = () => {
    const { deck, setDeck } = useMTGDeckCreator()

    if (!deck) {
        console.log('[DeckCreatorPiles] No deck, rendering loading state.')
        return <Typography>Loading deck...</Typography>
    }

    const { cards: deckCardEntries, zones } = deck
    console.log('[DeckCreatorPiles] Deck loaded. Entries:', deckCardEntries?.length, 'Zones:', zones?.length)

    const allDeckCardsMap = new Map(deckCardEntries.map((dc) => [dc.card.ID, dc.card]))

    const allCategorizedCardIds = new Set<string>()
    zones.forEach((zone) => {
        zone.childrenIDs.forEach((id) => allCategorizedCardIds.add(id))
    })

    const finalUncategorizedCards = deckCardEntries
        .map((dc) => dc.card)
        .filter((card) => !allCategorizedCardIds.has(card.ID))

    const uncategorizedZoneForDisplay = {
        ID: 'uncategorized',
        name: 'Uncategorized',
        childrenIDs: finalUncategorizedCards.map((c) => c.ID),
    }
    const allZonesForDisplay: (FlowZone | { ID: string; name: string; childrenIDs: string[] })[] = [
        uncategorizedZoneForDisplay,
        ...zones,
    ]

    console.log(
        '[DeckCreatorPiles] Data processed. Zones to display:',
        allZonesForDisplay.length,
        'Uncategorized cards:',
        finalUncategorizedCards.length,
    )
    if (allDeckCardsMap.size === 0 && deckCardEntries.length > 0) {
        console.warn('[DeckCreatorPiles] allDeckCardsMap is empty but deckCardEntries is not. Check map population.')
    }

    const handleAddZone = () => {
        const zoneName = prompt('Enter name for the new zone:')
        if (zoneName && deck) {
            const newZoneToAdd: FlowZone = {
                ID: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                name: zoneName,
                childrenIDs: [],
                position: { x: 0, y: 0 },
                width: 200,
                height: 300,
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

        // Dropped outside the list or no change
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return
        }

        if (type === 'CARD_LIST') {
            setDeck((prevDeck) => {
                if (!prevDeck) return prevDeck

                const newZones = [...prevDeck.zones] // Shallow copy of zones array
                const newUncategorizedChildrenIds = [
                    ...(allZonesForDisplay.find((z) => z.ID === 'uncategorized')?.childrenIDs || []),
                ]

                const sourceIsUncategorized = source.droppableId === 'uncategorized'
                const destinationIsUncategorized = destination.droppableId === 'uncategorized'

                // --- Handling card removal from source ---
                if (sourceIsUncategorized) {
                    newUncategorizedChildrenIds.splice(source.index, 1)
                } else {
                    const sourceZoneIndex = newZones.findIndex((z) => z.ID === source.droppableId)
                    if (sourceZoneIndex !== -1) {
                        const sourceChildren = [...newZones[sourceZoneIndex].childrenIDs]
                        sourceChildren.splice(source.index, 1)
                        newZones[sourceZoneIndex] = { ...newZones[sourceZoneIndex], childrenIDs: sourceChildren }
                    } else {
                        console.error('Source zone not found for actual zone', source.droppableId)
                        return prevDeck // Error case
                    }
                }

                // --- Handling card addition to destination ---
                if (destinationIsUncategorized) {
                    newUncategorizedChildrenIds.splice(destination.index, 0, draggableId)
                    // When moving to uncategorized, ensure it's removed from any actual zone implicitly by the previous step
                    // If it was already in an actual zone, it was removed. If not, this just adds it to uncategorized.
                } else {
                    const destZoneIndex = newZones.findIndex((z) => z.ID === destination.droppableId)
                    if (destZoneIndex !== -1) {
                        const destChildren = [...newZones[destZoneIndex].childrenIDs]
                        destChildren.splice(destination.index, 0, draggableId)
                        newZones[destZoneIndex] = { ...newZones[destZoneIndex], childrenIDs: destChildren }
                    } else {
                        console.error('Destination zone not found for actual zone', destination.droppableId)
                        return prevDeck // Error case
                    }
                }

                // Note: The `newUncategorizedChildrenIds` isn't directly part of `prevDeck.zones`.
                // The effect on "uncategorized" is implicit: if a card is in a real zone, it's not uncategorized.
                // If it's moved from a real zone to uncategorized, it's removed from the real zone's childrenIDs.
                // If it's moved from uncategorized to a real zone, it's added to the real zone's childrenIDs.
                // Reordering within uncategorized would require a different approach as it's a derived list.

                return { ...prevDeck, zones: newZones }
            })
        }
    }

    console.log('[DeckCreatorPiles] About to render main DragDropContext.')

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Box
                sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    height: '100%',
                    p: 1,
                    gap: 2,
                }}
            >
                {allZonesForDisplay.map((zone) => {
                    console.log(
                        `[DeckCreatorPiles] Mapping zone: ${zone.ID} (${zone.name}) with ${zone.childrenIDs.length} children.`,
                    )
                    let cardsToRenderInZone: MTG_Card[]
                    if (zone.ID === 'uncategorized') {
                        cardsToRenderInZone = finalUncategorizedCards
                    } else {
                        cardsToRenderInZone = zone.childrenIDs
                            .map((id) => {
                                const card = allDeckCardsMap.get(id)
                                // if (!card) console.warn(`Card ID ${id} not found in allDeckCardsMap for zone ${zone.ID}`);
                                return card
                            })
                            .filter((card): card is MTG_Card => card !== undefined)
                    }
                    console.log(`[DeckCreatorPiles] Zone ${zone.ID} has ${cardsToRenderInZone.length} cards to render.`)

                    return (
                        <Droppable droppableId={zone.ID} key={zone.ID} type="CARD_LIST">
                            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                <Box
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    sx={{
                                        minWidth: '200px',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: '1px solid lightgray',
                                        borderRadius: '4px',
                                        backgroundColor: snapshot.isDraggingOver ? 'lightblue' : 'transparent',
                                        transition: 'background-color 0.2s ease',
                                    }}
                                >
                                    <Typography
                                        variant="h6"
                                        sx={{ p: 1, backgroundColor: 'grey.200', textAlign: 'center' }}
                                    >
                                        {zone.name}
                                    </Typography>
                                    <Box
                                        sx={{
                                            flexGrow: 1,
                                            overflowY: 'auto',
                                            p: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {cardsToRenderInZone.map((cardInPile, index) => (
                                            // console.log(`[DeckCreatorPiles] Rendering card ${cardInPile.ID} in zone ${zone.ID}`);
                                            <Draggable draggableId={cardInPile.ID} index={index} key={cardInPile.ID}>
                                                {(
                                                    providedDraggable: DraggableProvided,
                                                    snapshotDraggable: DraggableStateSnapshot,
                                                ) => (
                                                    <Box
                                                        ref={providedDraggable.innerRef}
                                                        {...providedDraggable.draggableProps}
                                                        {...providedDraggable.dragHandleProps}
                                                        sx={{
                                                            userSelect: 'none',
                                                            margin: '0 0 4px 0',
                                                            opacity: snapshotDraggable.isDragging ? 0.8 : 1,
                                                            ...providedDraggable.draggableProps.style,
                                                        }}
                                                    >
                                                        <MTGCardWithHover
                                                            data={{ type: 'card', card: cardInPile }}
                                                            hideHover={snapshotDraggable.isDragging}
                                                        />
                                                    </Box>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {cardsToRenderInZone.length === 0 && !provided.placeholder && (
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                                Drop cards here
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Droppable>
                    )
                })}
                <Box
                    sx={{
                        minWidth: '150px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        p: 1,
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
