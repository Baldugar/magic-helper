import { Close } from '@mui/icons-material'
import { ButtonBase, Grid } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { MTGACardWithHover } from '../../../components/MTGCardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
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
    const { onAddCard, deck, removeCard, setDeck } = useMTGDeckCreator()
    const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGDeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { card: draggedCard } = useDnD()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()
    const defaultVersion = card.versions.find((v) => v.isDefault)

    if (!defaultVersion) return null

    const handleAddCard = (card: MTG_Card) => {
        const newDeck = onAddCard(card)
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
            label: 'Add as deck image',
            action: () => {
                if (!deck) return
                setDeck((prev) => {
                    if (!prev) return prev
                    return { ...prev, cardFrontImage: card.ID }
                })
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

    if (!deck) return null

    return (
        <Grid item xs={'auto'}>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <ButtonBase
                    onClick={() => handleAddCard(card)}
                    sx={{
                        filter: deckCardIDs.includes(card.ID) ? 'brightness(0.5)' : 'brightness(1)',
                        transition: 'filter 0.3s ease, opacity 0.3s ease',
                        position: 'relative',
                        opacity: deck.ignoredCards.includes(card.ID) ? 0.5 : 1,
                    }}
                >
                    <MTGACardWithHover card={card} hideHover={draggedCard !== null} debugValue={'layout'} />
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
            <ContextMenu
                anchorRef={anchorRef}
                options={options}
                open={open}
                handleClose={handleClose}
                handleClick={handleClick}
            />
        </Grid>
    )
}
