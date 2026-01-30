import { NodeProps, useReactFlow } from '@xyflow/react'
import { clone } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { useMTGCards } from '../../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreatorLogic } from '../../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckFlowCreator } from '../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { useMTGDecks } from '../../../../context/MTGA/Decks/useMTGDecks'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { Maybe, MTG_Card, MTG_DeckCardType } from '../../../../graphql/types'
import { getCorrectCardImage } from '../../../../utils/functions/cardFunctions'
import { findNextAvailablePosition, NodeType } from '../../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../../utils/hooks/ContextMenu/useContextMenu'
import { CreateTagDialog } from '../../FilterBar/TagDialogs/CreateTagDialog'
import { PhantomNodeData } from './PhantomNode'

export type CardNodeData = {
    card: MTG_Card
    selectedVersionID: Maybe<string> | undefined
}

export type CardNodeProps = NodeProps & {
    data: CardNodeData
}

export const CardNode = (props: CardNodeProps) => {
    const { data, id, parentId /* positionAbsoluteX, positionAbsoluteY */ } = props
    const { card, selectedVersionID } = data
    const { deck, removeCard } = useMTGDeckCreatorLogic()
    const { decks, createDeck, propagateChangesToDashboardDeck } = useMTGDecks()
    const { draggingZoneIDs } = useMTGDeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { refetch: refetchCards } = useMTGCards()
    const cardRef = useRef(card)
    cardRef.current = card
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()
    const [tagOptionsForMenu, setTagOptionsForMenu] = useState<ContextMenuOption[] | null>(null)
    const [openCreateTagDialog, setOpenCreateTagDialog] = useState(false)

    const selectedVersion =
        card.versions.find((v) => v.ID === selectedVersionID) || card.versions.find((v) => v.isDefault)

    useEffect(() => {
        if (!open) {
            setTagOptionsForMenu(null)
            return
        }
        if (tagOptionsForMenu === null) {
            setTagOptionsForMenu([{ label: 'Loading...' }])
            MTGFunctions.queries
                .getMTGTagsQuery()
                .then((tags) => {
                    const cardTagIds = new Set((card.tags ?? []).map((t) => t.ID))
                    setTagOptionsForMenu(
                        tags.map((tag) => ({
                            id: tag.ID,
                            label: tag.name,
                            selected: cardTagIds.has(tag.ID),
                            action: () => {
                                const c = cardRef.current
                                if (!c) return
                                const currentlyHas = (c.tags ?? []).some((t) => t.ID === tag.ID)
                                if (currentlyHas) {
                                    MTGFunctions.mutations
                                        .unassignTagFromCardMutation({ cardID: c.ID, tagID: tag.ID })
                                        .then(() => refetchCards())
                                } else {
                                    MTGFunctions.mutations
                                        .assignTagToCardMutation({ cardID: c.ID, tagID: tag.ID })
                                        .then(() => refetchCards())
                                }
                            },
                        })),
                    )
                })
                .catch(() => setTagOptionsForMenu([{ label: 'Failed to load tags' }]))
        } else if (
            tagOptionsForMenu.length > 0 &&
            tagOptionsForMenu.every((o) => o.id) &&
            !tagOptionsForMenu.some((o) => o.label === 'Loading...' || o.label === 'Failed to load tags')
        ) {
            setTagOptionsForMenu((prev) =>
                (prev ?? []).map((opt) => ({
                    ...opt,
                    selected: (card.tags ?? []).some((t) => t.ID === opt.id),
                })),
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- tagOptionsForMenu intentionally omitted to trigger load when null
    }, [open, card.ID, card.tags, refetchCards])

    if (!selectedVersion) return null

    const image = getCorrectCardImage(selectedVersion, 'normal')
    const showContextMenu = !((parentId && draggingZoneIDs.includes(parentId)) || draggingZoneIDs.includes(id))

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                const confirm = window.confirm('Are you sure you want to delete this card?')
                if (!confirm) return
                removeCard(card)
                if (setNodes)
                    setNodes((prev) =>
                        // Remove the card node and all phantom nodes that have phantomOf as the card ID
                        prev.filter(
                            (n) =>
                                !n.id.startsWith(card.ID) &&
                                (n.type !== 'phantomNode' ||
                                    (n.type === 'phantomNode' && (n.data as PhantomNodeData).phantomOf !== card.ID)),
                        ),
                    )
            },
        },
        {
            id: 'addToOtherDeck',
            label: 'Add to other deck',
            shouldKeepOpen: true,
            subMenu: [
                {
                    id: 'createNewDeck',
                    label: 'Create new deck',
                    shouldKeepOpen: true,
                    action: () => {
                        const name = prompt('Enter the name of the new deck')
                        if (!name) return
                        createDeck(name).then((deckID) => {
                            const {
                                queries: { getMTGDeckQuery },
                            } = MTGFunctions
                            getMTGDeckQuery(deckID).then((loadedDeck) => {
                                const newDeck = clone(loadedDeck)
                                newDeck.cards.push({
                                    card,
                                    count: 1,
                                    deckCardType: MTG_DeckCardType.NORMAL,
                                    phantoms: [],
                                    position: { x: 0, y: 0 },
                                    selectedVersionID: selectedVersion.ID,
                                })
                                propagateChangesToDashboardDeck(newDeck, true)
                            })
                        })
                    },
                },
                ...decks
                    .filter((d) => d.ID !== deck?.ID)
                    .map((otherDeck) => {
                        const alreadyInDeck = otherDeck.cards.find((c) => c.card.ID === card.ID)
                        const {
                            queries: { getMTGDeckQuery },
                        } = MTGFunctions
                        return {
                            label: otherDeck.name,
                            selected: alreadyInDeck ? true : false,
                            shouldKeepOpen: true,
                            action: !alreadyInDeck
                                ? () => {
                                      getMTGDeckQuery(otherDeck.ID).then((loadedDeck) => {
                                          const newDeck = clone(loadedDeck)
                                          newDeck.cards.push({
                                              card,
                                              count: 1,
                                              deckCardType: MTG_DeckCardType.NORMAL,
                                              phantoms: [],
                                              position: findNextAvailablePosition(loadedDeck.cards),
                                              selectedVersionID: selectedVersion.ID,
                                          })
                                          propagateChangesToDashboardDeck(newDeck, true)
                                      })
                                  }
                                : () => {
                                      getMTGDeckQuery(otherDeck.ID).then((loadedDeck) => {
                                          const newDeck = clone(loadedDeck)
                                          const cardIndex = newDeck.cards.findIndex((c) => c.card.ID === card.ID)
                                          if (cardIndex !== -1) {
                                              newDeck.cards.splice(cardIndex, 1)
                                          }
                                          propagateChangesToDashboardDeck(newDeck, true)
                                      })
                                  },
                        } as ContextMenuOption
                    }),
            ],
        },
        {
            id: 'assignTag',
            label: 'Assign tag',
            shouldKeepOpen: true,
            subMenu: [
                {
                    id: 'createTag',
                    label: 'Create new tag...',
                    action: () => {
                        handleClose()
                        setOpenCreateTagDialog(true)
                    },
                },
                ...(tagOptionsForMenu === null ||
                (tagOptionsForMenu.length === 1 && tagOptionsForMenu[0].label === 'Loading...')
                    ? [{ label: 'Loading...' }]
                    : tagOptionsForMenu.every((o) => !o.action)
                      ? tagOptionsForMenu
                      : tagOptionsForMenu),
            ],
        },
        // {
        //     label: 'Create Phantom',
        //     action: () => {
        //         const nodes = getNodes()
        //         const zone = nodes.find(
        //             (n) => n.type === 'zoneNode' && (n.data as ZoneNodeData)?.cardChildren?.includes(card.ID),
        //         )
        //         const newPosition: Position = {
        //             x: (zone?.position.x ?? 0) + positionAbsoluteX + 100,
        //             y: (zone?.position.y ?? 0) + positionAbsoluteY,
        //         }
        //         onAddCard(card, newPosition)
        //         addNodes([
        //             {
        //                 data: {
        //                     card: card,
        //                     index: card.phantoms.length,
        //                     onDelete: handleDeletePhantom,
        //                     phantomOf: card.ID,
        //                     position: newPosition,
        //                 },
        //                 id: uuidv4(),
        //                 position: newPosition,
        //                 type: 'phantomNode',
        //             } as Node<PhantomNodeData>,
        //         ])
        //         updateNode(card.card.ID, {
        //             data: {
        //                 card: { ...card, phantoms: [...card.phantoms, newPosition] },
        //             } as CardNodeData,
        //         })
        //     },
        // },
    ]

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img src={image} alt={card.name} width={100} style={{ borderRadius: 5 }} />
            </div>
            {showContextMenu && (
                <ContextMenu
                    anchorRef={anchorRef}
                    options={options}
                    open={open}
                    handleClose={handleClose}
                    handleClick={handleClick}
                />
            )}
            <CreateTagDialog
                open={openCreateTagDialog}
                onClose={() => setOpenCreateTagDialog(false)}
                onCreated={(tag) => {
                    const c = cardRef.current
                    if (c) {
                        MTGFunctions.mutations
                            .assignTagToCardMutation({ cardID: c.ID, tagID: tag.ID })
                            .then(() => refetchCards())
                    }
                    setTagOptionsForMenu(null)
                    setOpenCreateTagDialog(false)
                }}
            />
        </>
    )
}
