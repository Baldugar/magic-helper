import { keyframes } from '@emotion/react'
import { Close } from '@mui/icons-material'
import { ButtonBase, Dialog, DialogContent, DialogTitle, Grid } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { MTGACardWithHover } from '../../../components/MTGCardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
import { useMTGCardPackages } from '../../../context/MTGA/CardPackages/useCardPackages'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type CardsGridButtonProps = {
    card: MTG_Card
}

export const CardsGridButton = (props: CardsGridButtonProps) => {
    const { card } = props
    const { decks, updateDeck } = useMTGDecks()
    const { cardPackages, updateCardPackage } = useMTGCardPackages()

    const {
        mutations: { addMTGCardToCardPackage, removeMTGCardFromCardPackage, createMTGCardPackage },
    } = MTGFunctions

    const { onAddCard, deck, removeCard, setDeck } = useMTGDeckCreator()
    const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGDeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { card: draggedCard } = useDnD()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()
    const [showAllVersions, setShowAllVersions] = useState(false)

    const defaultVersion = card.versions.find((v) => v.isDefault)

    if (!defaultVersion) return null

    const handleAddCard = (card: MTG_Card, versionID?: string) => {
        const newDeck = onAddCard(card, undefined, undefined, versionID)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone, handleDeletePhantom))
    }

    const handleRemoveCard = (card: MTG_Card) => {
        removeCard(card)
        if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(card.ID)))
    }

    const deckCardIDs = deck?.cards.map((c) => c.card.ID) || []

    const cardIsInDeck = isCardInDeck(card, deck)
    const {
        mutations: { updateMTGDeck: updateMTGADeck },
    } = MTGFunctions

    const options: ContextMenuOption[] = [
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
            label: 'Ignore card',
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
                    const cardIndex = newDeck.cards.findIndex((c) => c.card.ID === card.ID)
                    const ignoreIndex = newDeck.ignoredCards.findIndex((c) => c === card.ID)
                    if (cardIndex !== -1) {
                        newDeck.cards.splice(cardIndex, 1)
                    }
                    if (ignoreIndex === -1) {
                        newDeck.ignoredCards.push(card.ID)
                    } else {
                        newDeck.ignoredCards.splice(ignoreIndex, 1)
                    }
                    return newDeck
                })
            },
        },
        {
            id: 'addToOtherDeck',
            label: 'Add to other deck',
            subMenu: [
                {
                    label: 'Create new deck',
                    action: () => {
                        const name = prompt('Enter the name of the new deck')
                        if (!name) return
                        const {
                            mutations: { createMTGDeck: createMTGADeck },
                        } = MTGFunctions
                        // TODO: The type should be dynamic
                        createMTGADeck({ name }).then((deck) => {
                            const d = onAddCard(card, undefined, deck)
                            if (!d) return
                            updateDeck(d)
                            updateMTGADeck({
                                cards: d.cards.map((c) => ({
                                    ...c,
                                    card: c.card.ID,
                                    ID: c.card.ID,
                                })),
                                deckID: d.ID,
                                ignoredCards: d.ignoredCards,
                                name: d.name,
                                zones: d.zones.map((z) => ({
                                    ...z,
                                    ID: z.ID,
                                    name: z.name,
                                    position: z.position,
                                })),
                                cardFrontImage: d.cardFrontImage,
                            })
                            updateDeck(d)
                        })
                    },
                    shouldKeepOpen: true,
                },
                ...decks
                    .filter((d) => d.ID !== deck?.ID)
                    .map((d) => {
                        const alreadyInDeck = d.cards.find((c) => c.card.ID === card.ID)
                        return {
                            label: d.name,
                            selected: alreadyInDeck ? true : false,
                            action: !alreadyInDeck
                                ? () => {
                                      const deck = onAddCard(card, undefined, d)
                                      if (!deck) return
                                      updateDeck(deck)
                                      updateMTGADeck({
                                          cards: deck.cards.map((c) => ({
                                              ...c,
                                              card: c.card.ID,
                                              ID: c.card.ID,
                                          })),
                                          deckID: deck.ID,
                                          ignoredCards: deck.ignoredCards,
                                          name: deck.name,
                                          zones: deck.zones.map((z) => ({
                                              ...z,
                                              ID: z.ID,
                                              name: z.name,
                                              position: z.position,
                                          })),
                                          cardFrontImage: deck.cardFrontImage,
                                      })
                                  }
                                : () => {
                                      const deck = structuredClone(d)
                                      if (!deck) return
                                      const cardIndex = deck.cards.findIndex((c) => c.card.ID === card.ID)
                                      if (cardIndex !== -1) {
                                          deck.cards.splice(cardIndex, 1)
                                      }
                                      updateDeck(deck)
                                      updateMTGADeck({
                                          cards: deck.cards.map((c) => ({
                                              ...c,
                                              card: c.card.ID,
                                              ID: c.card.ID,
                                          })),
                                          deckID: deck.ID,
                                          ignoredCards: deck.ignoredCards,
                                          name: deck.name,
                                          zones: deck.zones.map((z) => ({
                                              ...z,
                                              ID: z.ID,
                                              name: z.name,
                                              position: z.position,
                                          })),
                                          cardFrontImage: deck.cardFrontImage,
                                      })
                                  },
                            shouldKeepOpen: true,
                        } as ContextMenuOption
                    }),
            ],
        },
        {
            id: 'addToCardPackage',
            label: 'Add to card package',
            subMenu: [
                {
                    label: 'Create new card package',
                    action: () => {
                        const name = prompt('Enter the name of the new card package')
                        if (!name) return
                        createMTGCardPackage({ name }).then((cardPackage) => {
                            addMTGCardToCardPackage({
                                cardPackageID: cardPackage.ID,
                                card: card.ID,
                                count: 1,
                            }).then((cp) => {
                                updateCardPackage(cp)
                            })
                        })
                    },
                    shouldKeepOpen: false,
                },
                ...cardPackages.map((cp) => {
                    const alreadyInDeck = cp.cards.find((c) => c.card.ID === card.ID)
                    return {
                        label: cp.name,
                        selected: alreadyInDeck ? true : false,
                        action: !alreadyInDeck
                            ? () => {
                                  addMTGCardToCardPackage({
                                      cardPackageID: cp.ID,
                                      card: card.ID,
                                      count: 1,
                                  }).then((cp) => {
                                      updateCardPackage(cp)
                                  })
                              }
                            : () => {
                                  removeMTGCardFromCardPackage({
                                      cardPackageID: cp.ID,
                                      card: card.ID,
                                  }).then((cp) => {
                                      updateCardPackage(cp)
                                  })
                              },
                        shouldKeepOpen: false,
                    } as ContextMenuOption
                }),
            ],
        },

        {
            label: 'Add as deck image',
            action: () => {
                if (!deck) return
                setDeck((prev) => {
                    if (!prev) return prev
                    return { ...prev, cardFrontImage: card.ID }
                })
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
        options.splice(1, 0, {
            label: 'Add phantom',
            action: () => {
                handleAddCard(card)
            },
        })
    }

    // If the card has more than 1 version add the show all versions option second to last
    if (card.versions.length > 1) {
        options.splice(options.length - 1, 0, {
            label: 'Show all versions',
            action: () => {
                setShowAllVersions(true)
            },
        })
    }

    if (!deck) return null

    const selectedVersion = deckCardIDs.includes(card.ID)
        ? card.versions.find((v) => v.ID === deck.cards.find((c) => c.card.ID === card.ID)?.selectedVersionID)
        : null

    return (
        <Grid item xs={'auto'}>
            <ErrorBoundary fallback={<div>Something went wrong {card.ID}</div>}>
                <div ref={anchorRef} onContextMenu={handleContextMenu}>
                    <ButtonBase
                        onClick={() => handleAddCard(card)}
                        sx={{
                            filter: deckCardIDs.includes(card.ID) ? 'brightness(0.5)' : 'brightness(1)',
                            transition: 'filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease, outline 0.3s ease',
                            outline: 'none',
                            position: 'relative',
                            opacity: deck.ignoredCards.includes(card.ID) ? 0.5 : 1,
                            '&:hover': {
                                filter: 'brightness(1.2)',
                                transform: 'scale(1.1)',
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: '0px',
                                    left: '0px',
                                    right: '0px',
                                    bottom: '0px',
                                    borderRadius: '8px',
                                    animation: `${colorCycle} 4s linear infinite`,
                                    zIndex: -1,
                                },
                            },
                            '& img': {
                                borderRadius: '8px',
                            },
                        }}
                        id={`card-${card.ID}`}
                    >
                        {selectedVersion ? (
                            <MTGACardWithHover
                                data={{
                                    card: selectedVersion,
                                    type: 'cardVersion',
                                    cardTypeLine: card.typeLine,
                                    layout: card.layout,
                                    debugValue: 'set',
                                }}
                                hideHover={draggedCard !== null}
                            />
                        ) : (
                            <MTGACardWithHover
                                data={{
                                    card,
                                    type: 'card',
                                    debugValue: 'layout',
                                }}
                                hideHover={draggedCard !== null}
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
                anchorRef={anchorRef}
                options={options}
                open={open}
                handleClose={handleClose}
                handleClick={handleClick}
            />
            <Dialog
                open={showAllVersions}
                onClose={() => setShowAllVersions(false)}
                onWheel={(e) => e.stopPropagation()}
            >
                <DialogTitle>All versions of {card.name}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {card.versions
                            .sort((a, b) => new Date(a.releasedAt).getTime() - new Date(b.releasedAt).getTime())
                            .map((v) => (
                                <Grid item key={v.ID}>
                                    <ButtonBase onClick={() => handleAddCard(card, v.ID)}>
                                        <MTGACardWithHover
                                            data={{
                                                card: v,
                                                type: 'cardVersion',
                                                cardTypeLine: card.typeLine,
                                                layout: card.layout,
                                                debugValue: 'set',
                                            }}
                                            hideHover={draggedCard !== null}
                                        />
                                    </ButtonBase>
                                </Grid>
                            ))}
                    </Grid>
                </DialogContent>
            </Dialog>
        </Grid>
    )
}

// Define a keyframe animation for rotating colors
const colorCycle = keyframes`
    0% {
        box-shadow: 0 0 15px #ff0000, 0 0 20px #ff0000;
    }
    25% {
        box-shadow: 0 0 15px #ff7f00, 0 0 20px #ff7f00;
    }
    50% {
        box-shadow: 0 0 15px #ffff00, 0 0 20px #ffff00;
    }
    75% {
        box-shadow: 0 0 15px #00ff00, 0 0 20px #00ff00;
    }
    100% {
        box-shadow: 0 0 15px #ff0000, 0 0 20px #ff0000;
    }
`
