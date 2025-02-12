import { Close } from '@mui/icons-material'
import { ButtonBase, Grid } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { MTGACardWithHover } from '../../../components/MTGACardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { useMTGADeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGADeckFlowCreator'
import { MTGA_Card } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { ContextMenu, ContextMenuOption } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type CardsGridButtonProps = {
    card: MTGA_Card
}

export const CardsGridButton = (props: CardsGridButtonProps) => {
    const { card } = props
    const { onAddCard, deck, removeCard, setDeck } = useMTGADeckCreator()
    const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGADeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { card: draggedCard } = useDnD()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const handleAddCard = (card: MTGA_Card) => {
        const newDeck = onAddCard(card)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone, handleDeletePhantom))
    }

    const handleRemoveCard = (card: MTGA_Card) => {
        removeCard(card)
        if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(card.ID)))
    }

    const deckCardIDs = deck?.cards.map((c) => c.card.ID) || []

    const cardIsInDeck = isCardInDeck(card, deck)

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
            label: 'View card',
            action: () => {
                window.open(card.scryfallURL, '_blank')
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
                    <MTGACardWithHover card={card} hideHover={draggedCard !== null} debugValue={'releasedAt'} />
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
