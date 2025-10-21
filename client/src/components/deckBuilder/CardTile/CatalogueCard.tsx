import { Close } from '@mui/icons-material'
import { ButtonBase, Dialog, DialogContent, DialogTitle, Grid, useMediaQuery } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { clone } from 'lodash'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useMTGDeckCreatorLogic } from '../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckCreatorUI } from '../../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, MTG_CardVersion, MTG_DeckCardType, MTG_Image } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { singleSetSelected } from '../../../utils/functions/filterFunctions'
import { findNextAvailablePosition, NodeType } from '../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'
import { PhantomNodeData } from '../FlowCanvas/Nodes/PhantomNode'
import { MTGCardWithHover } from './MTGCardWithHover'
import { VersionCard } from './VersionCard'

export type CatalogueCardProps = {
    card: MTG_Card
    onIgnore?: () => void
    cardScale?: number
    forceImage?: keyof Omit<MTG_Image, '__typename'>
}

/**
 * CatalogueCard renders a single card tile within the catalogue grid.
 *
 * Capabilities
 * - Left click to add to the deck
 * - Context menu with actions (add/remove, ignore, add to package, set as deck image)
 * - Shows version modal, integrates with DnD and deck graph updates
 */
export const CatalogueCard = (props: CatalogueCardProps) => {
    const { card, onIgnore, cardScale = 1, forceImage } = props

    const { decks, createDeck, propagateChangesToDashboardDeck } = useMTGDecks()
    const { onAddCard, deck, removeCard, setDeck } = useMTGDeckCreatorLogic()
    const { setOpenedCardDialog } = useMTGDeckCreatorUI()
    const { setNodes } = useReactFlow<NodeType>()
    const { filter, setFilter } = useMTGFilter()
    const {
        anchorRef: mainCardAnchorRef,
        handleClick: mainCardHandleClick,
        handleClose: mainCardHandleClose,
        handleContextMenu: mainCardHandleContextMenu,
        open: mainCardOpen,
    } = useContextMenu<HTMLDivElement>()

    const isMobile = useMediaQuery('(max-width: 600px)')

    const [showAllVersions, setShowAllVersions] = useState(false)

    // Track long-press position for mobile context menu
    const [mobilePosition, setMobilePosition] = useState<{ x: number; y: number } | undefined>(undefined)

    const defaultVersion = card.versions.find((v) => v.isDefault)

    if (!defaultVersion) return null

    const handleAddCard = (card: MTG_Card, versionID?: string) => {
        onAddCard(card, undefined, versionID)
    }

    const handleRemoveCard = (card: MTG_Card) => {
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
    }

    if (!deck) return null

    const deckCardIDs = deck.cards.map((c) => c.card.ID)

    const cardIsInDeck = isCardInDeck(card, deck)

    const selectedVersion = deckCardIDs.includes(card.ID)
        ? card.versions.find((v) => v.ID === deck.cards.find((c) => c.card.ID === card.ID)?.selectedVersionID)
        : null

    const cardIsIgnored = deck.ignoredCards.includes(card.ID)

    const mainCardOptions: ContextMenuOption[] = [
        {
            label: !cardIsInDeck ? 'Add to deck' : 'Remove from deck',
            action: () => {
                if (!cardIsInDeck) {
                    handleAddCard(card)
                } else {
                    handleRemoveCard(card)
                }
            },
        },
        {
            label: 'Ignore card', // TODO: Fix this
            action: () => {
                if (!deck) return
                let confirmation = true
                if (deck && deck.cards.find((c) => c.card.ID === card.ID)) {
                    confirmation = confirm('This card is in the deck, are you sure you want to ignore it?')
                }
                if (!confirmation) return
                setDeck((prev) => {
                    if (!prev) return prev
                    // If the card is in the cards inside the deck, remove it
                    // Then if it's not in the ignore cards, add it
                    // If it is in the ignore cards, remove it
                    const newDeck = { ...prev }
                    const ignoreIndex = newDeck.ignoredCards.findIndex((c) => c === card.ID)
                    if (ignoreIndex === -1) {
                        newDeck.ignoredCards.push(card.ID)
                    } else {
                        newDeck.ignoredCards.splice(ignoreIndex, 1)
                    }
                    if (filter.hideIgnored) {
                        setFilter((prev) => ({
                            ...prev,
                            ignoredCardIDs: newDeck.ignoredCards,
                        }))
                    }
                    return newDeck
                })
                const {
                    mutations: { addIgnoredCardMutation, removeIgnoredCardMutation },
                } = MTGFunctions
                if (cardIsIgnored) {
                    removeIgnoredCardMutation({ cardID: card.ID, deckID: deck.ID }).then(() => {
                        if (onIgnore) onIgnore()
                    })
                } else {
                    addIgnoredCardMutation({ cardID: card.ID, deckID: deck.ID }).then(() => {
                        if (onIgnore) onIgnore()
                    })
                }
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
                            getMTGDeckQuery(deckID).then((deck) => {
                                const newDeck = clone(deck)
                                newDeck.cards.push({
                                    card,
                                    count: 1,
                                    deckCardType: MTG_DeckCardType.NORMAL,
                                    phantoms: [],
                                    position: { x: 0, y: 0 },
                                })
                                propagateChangesToDashboardDeck(newDeck, true)
                            })
                        })
                    },
                },
                ...decks
                    .filter((d) => d.ID !== deck?.ID)
                    .map((deck) => {
                        const alreadyInDeck = deck.cards.find((c) => c.card.ID === card.ID)
                        const {
                            queries: { getMTGDeckQuery },
                        } = MTGFunctions
                        let version: MTG_CardVersion | undefined
                        const set = singleSetSelected(filter)
                        if (set) {
                            version = card.versions.find((v) => v.set === set)
                        } else {
                            version = card.versions.find((v) => v.isDefault)
                        }
                        return {
                            label: deck.name,
                            selected: alreadyInDeck ? true : false,
                            shouldKeepOpen: true,
                            action: !alreadyInDeck
                                ? () => {
                                      getMTGDeckQuery(deck.ID).then((loadedDeck) => {
                                          const newDeck = clone(loadedDeck)
                                          newDeck.cards.push({
                                              card,
                                              count: 1,
                                              deckCardType: MTG_DeckCardType.NORMAL,
                                              phantoms: [],
                                              position: findNextAvailablePosition(loadedDeck.cards),
                                              selectedVersionID: version?.ID,
                                          })
                                          propagateChangesToDashboardDeck(newDeck, true)
                                      })
                                  }
                                : () => {
                                      getMTGDeckQuery(deck.ID).then((loadedDeck) => {
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
            label: 'Add as deck image',
            action: () => {
                if (!deck) return
                setDeck((prev) => {
                    let version: MTG_CardVersion | undefined
                    const set = singleSetSelected(filter)
                    if (set) {
                        version = card.versions.find((v) => v.set === set)
                    } else {
                        version = card.versions.find((v) => v.isDefault)
                    }
                    if (!version) return prev
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
            label: 'Open card details',
            action: () => {
                setOpenedCardDialog(card.ID)
            },
        },
        {
            label: 'Log card',
            action: () => {
                console.log(card)
            },
        },
    ]

    if (cardIsInDeck) {
        mainCardOptions.splice(1, 0, {
            label: 'Add phantom',
            action: () => {
                handleAddCard(card)
            },
        })
    }

    // If the card has more than 1 version add the show all versions option second to last
    if (card.versions.length > 1) {
        mainCardOptions.splice(mainCardOptions.length - 1, 0, {
            label: 'Show all versions',
            action: () => {
                setShowAllVersions(true)
            },
        })
    }

    // Remove long-press logic and use only onContextMenu
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (isMobile) {
            // For mobile, set the position and open the menu
            let x = 0,
                y = 0
            if ('touches' in e && e.touches.length > 0) {
                x = e.touches[0].clientX
                y = e.touches[0].clientY
            } else if ('clientX' in e) {
                x = e.clientX
                y = e.clientY
            }
            setMobilePosition({ x, y })
            e.preventDefault()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mainCardHandleContextMenu(e as any)
        } else {
            setMobilePosition(undefined)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mainCardHandleContextMenu(e as any)
        }
    }

    return (
        <Grid item xs={12} sm={'auto'} md={'auto'} lg={'auto'}>
            <ErrorBoundary
                fallback={
                    <div ref={mainCardAnchorRef} onContextMenu={handleContextMenu}>
                        <div>Something went wrong {card.ID}</div>
                    </div>
                }
            >
                <div ref={mainCardAnchorRef} onContextMenu={handleContextMenu}>
                    <ButtonBase
                        onClick={() => handleAddCard(card)}
                        sx={{
                            width: isMobile ? '100%' : 'auto',
                            filter: deckCardIDs.includes(card.ID) ? 'brightness(0.5)' : 'brightness(1)',
                            transition: 'filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease, outline 0.3s ease',
                            outline: 'none',
                            position: 'relative',
                            opacity: deck.ignoredCards.includes(card.ID) ? 0.5 : 1,
                            '&:hover': !isMobile
                                ? {
                                      filter: 'brightness(1.2)',
                                      transform: 'scale(1.01)',
                                      position: 'relative',
                                  }
                                : {},
                            '& img': {
                                borderRadius: '8px',
                            },
                        }}
                        id={`card-${card.ID}`}
                    >
                        {selectedVersion ? (
                            <MTGCardWithHover
                                data={{
                                    card: selectedVersion,
                                    type: 'cardVersion',
                                    cardTypeLine: card.typeLine,
                                    layout: card.layout,
                                }}
                                scale={isMobile ? 1 : cardScale}
                                forceImage={forceImage}
                                enableGlow={!isMobile}
                            />
                        ) : (
                            <MTGCardWithHover
                                data={{
                                    card,
                                    type: 'card',
                                }}
                                scale={isMobile ? 1 : cardScale}
                                forceImage={forceImage}
                                enableGlow={!isMobile}
                            />
                        )}
                        {deck.ignoredCards.includes(card.ID) && (
                            <Close
                                sx={{
                                    position: 'absolute',
                                    top: 15,
                                    left: `calc(50% - 15px)`,
                                    color: 'red',
                                    backgroundColor: '#00000099',
                                    borderRadius: '50%',
                                    width: 30,
                                    height: 30,
                                }}
                            />
                        )}
                    </ButtonBase>
                </div>
            </ErrorBoundary>
            <ContextMenu
                anchorRef={mainCardAnchorRef}
                options={mainCardOptions}
                open={mainCardOpen}
                handleClose={() => {
                    setMobilePosition(undefined)
                    mainCardHandleClose()
                }}
                handleClick={mainCardHandleClick}
                mobilePosition={mobilePosition}
            />
            <Dialog
                open={showAllVersions}
                onClose={() => setShowAllVersions(false)}
                onWheel={(e) => e.stopPropagation()}
            >
                <DialogTitle>All versions of {card.name}</DialogTitle>
                <DialogContent>
                    {/* Group versions by set */}
                    {(() => {
                        // Group versions by set
                        const versionsBySet: { [set: string]: MTG_CardVersion[] } = {}
                        card.versions.forEach((v) => {
                            if (!versionsBySet[v.set]) versionsBySet[v.set] = []
                            versionsBySet[v.set].push(v)
                        })
                        // Get set names and sort by earliest release date in each set
                        const setOrder = Object.keys(versionsBySet).sort((setA, setB) => {
                            const aEarliest = versionsBySet[setA].reduce((min, v) =>
                                new Date(v.releasedAt) < new Date(min.releasedAt) ? v : min,
                            )
                            const bEarliest = versionsBySet[setB].reduce((min, v) =>
                                new Date(v.releasedAt) < new Date(min.releasedAt) ? v : min,
                            )
                            return new Date(aEarliest.releasedAt).getTime() - new Date(bEarliest.releasedAt).getTime()
                        })
                        // Helper to format date as DD/MM/YYYY
                        const formatDate = (dateStr: string) => {
                            const d = new Date(dateStr)
                            return d.toLocaleDateString('en-GB')
                        }
                        return setOrder.map((set) => {
                            // Get earliest release date in this set
                            const earliest = versionsBySet[set].reduce((min, v) =>
                                new Date(v.releasedAt) < new Date(min.releasedAt) ? v : min,
                            )
                            // Use setName from the earliest version in the set
                            const setName = earliest.setName || set
                            return (
                                <div key={set} style={{ marginBottom: 24 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
                                        {formatDate(earliest.releasedAt)} - {setName}
                                    </div>
                                    <Grid container spacing={2}>
                                        {versionsBySet[set]
                                            .sort(
                                                (a, b) =>
                                                    new Date(a.releasedAt).getTime() - new Date(b.releasedAt).getTime(),
                                            )
                                            .map((v) => (
                                                <Grid item key={v.ID}>
                                                    <VersionCard
                                                        card={card}
                                                        version={v}
                                                        closeDialog={() => setShowAllVersions(false)}
                                                    />
                                                </Grid>
                                            ))}
                                    </Grid>
                                </div>
                            )
                        })
                    })()}
                </DialogContent>
            </Dialog>
        </Grid>
    )
}
