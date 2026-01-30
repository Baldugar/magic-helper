import { ButtonBase } from '@mui/material'
import { clone } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { useMTGCards } from '../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreatorLogic } from '../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, MTG_CardVersion, MTG_DeckCardType } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { findNextAvailablePosition } from '../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'
import { CreateTagDialog } from '../FilterBar/TagDialogs/CreateTagDialog'
import { MTGCardWithHover } from './MTGCardWithHover'

export type VersionCardProps = {
    card: MTG_Card
    version: MTG_CardVersion
    closeDialog: () => void
}

export const VersionCard = (props: VersionCardProps) => {
    const { card, version, closeDialog } = props

    const { decks, createDeck, propagateChangesToDashboardDeck } = useMTGDecks()
    const { onAddCard, deck, setDeck, setCardVersion } = useMTGDeckCreatorLogic()
    const { refetch: refetchCards } = useMTGCards()
    const cardRef = useRef(card)
    cardRef.current = card
    const [tagOptionsForMenu, setTagOptionsForMenu] = useState<ContextMenuOption[] | null>(null)
    const [openCreateTagDialog, setOpenCreateTagDialog] = useState(false)

    const handleAddCard = (card: MTG_Card, versionID?: string) => {
        onAddCard(card, undefined, versionID)
    }

    const {
        anchorRef: versionCardAnchorRef,
        handleClick: versionCardHandleClick,
        handleClose: versionCardHandleClose,
        handleContextMenu: versionCardHandleContextMenu,
        open: versionCardOpen,
    } = useContextMenu<HTMLDivElement>()

    useEffect(() => {
        if (!versionCardOpen) {
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
    }, [versionCardOpen, card.ID, card.tags, refetchCards])

    const versionCardOptions: ContextMenuOption[] = [
        {
            id: version.ID,
            label: 'Add as deck image',
            action: () => {
                if (!deck) return
                setDeck((prev) => {
                    return {
                        ...prev,
                        cardFrontImage: {
                            cardID: card.ID,
                            image: version.imageUris!,
                            versionID: version.ID,
                        },
                    }
                })
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
                                    selectedVersionID: version.ID,
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
                                              selectedVersionID: version.ID,
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
                        versionCardHandleClose()
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
        {
            label: 'Log version',
            action: () => {
                console.log(version)
            },
        },
    ]

    return (
        <>
            <div ref={versionCardAnchorRef} onContextMenu={versionCardHandleContextMenu}>
                <ButtonBase
                    onClick={
                        isCardInDeck(card, deck)
                            ? () => {
                                  setCardVersion(card.ID, version.ID)
                                  closeDialog()
                              }
                            : () => {
                                  handleAddCard(card, version.ID)
                                  closeDialog()
                              }
                    }
                >
                    <MTGCardWithHover
                        data={{
                            card: version,
                            type: 'cardVersion',
                            cardTypeLine: card.typeLine,
                            layout: card.layout,
                        }}
                    />
                </ButtonBase>
            </div>
            <ContextMenu
                anchorRef={versionCardAnchorRef}
                options={versionCardOptions}
                open={versionCardOpen}
                handleClose={versionCardHandleClose}
                handleClick={versionCardHandleClick}
            />
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
