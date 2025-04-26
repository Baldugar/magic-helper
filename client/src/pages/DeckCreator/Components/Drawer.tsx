import { Box, Button, Grid, Typography } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { sortBy } from 'lodash'
import { useMemo } from 'react'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_DeckCard, MTG_DeckCardType, MTG_UpdateDeckInput } from '../../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes, NodeType } from '../../../utils/functions/nodeFunctions'
import { DeckCard } from './DeckCard'

export const Drawer = () => {
    const { deckTab, setDeckTab, deck, selectingCommander, setSelectingCommander, removeCard, addOne, removeOne } =
        useMTGDeckCreator()
    const { getNodes, setNodes } = useReactFlow<NodeType>()
    const { updateDeck } = useMTGDecks()

    const {
        mutations: { updateMTGDeck, saveMTGDeckAsCopy },
    } = MTGFunctions

    const saveDeck = () => {
        if (!deck) return
        const nodes = getNodes()
        const deckInput: MTG_UpdateDeckInput = {
            cards: calculateCardsFromNodes(nodes, deck.cards),
            deckID: deck.ID,
            name: deck.name,
            zones: calculateZonesFromNodes(nodes),
            cardFrontImage: deck.cardFrontImage,
            ignoredCards: deck.ignoredCards,
        }
        updateMTGDeck(deckInput).then((deck) => {
            updateDeck(deck)
        })
    }

    const saveDeckAsCopy = () => {
        if (!deck) return
        const nodes = getNodes()
        const deckInput: MTG_UpdateDeckInput = {
            cards: calculateCardsFromNodes(nodes, deck.cards),
            deckID: deck.ID,
            name: deck.name,
            zones: calculateZonesFromNodes(nodes),
            cardFrontImage: deck.cardFrontImage,
            ignoredCards: deck.ignoredCards,
        }
        saveMTGDeckAsCopy(deckInput)
    }

    const handleRemoveCard = (deckCard: MTG_DeckCard) => {
        removeCard(deckCard.card)
        if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(deckCard.card.ID)))
    }
    const mainDeck = useMemo(
        () =>
            deck?.cards.filter(
                (c) => c.mainOrSide === MainOrSide.MAIN && c.deckCardType !== MTG_DeckCardType.COMMANDER,
            ) || [],
        [deck],
    )
    const sideboard = useMemo(() => deck?.cards.filter((c) => c.mainOrSide === MainOrSide.SIDEBOARD) || [], [deck])
    const sortedMainDeck = sortBy(mainDeck, (c) => c.card.name)
    const sortedSideboard = sortBy(sideboard, (c) => c.card.name)

    if (!deck) return null

    const commander = deck.cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
    // const companion = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMPANION)

    return (
        <Box width={500} display={'flex'} flexDirection={'column'} maxHeight={'100vh'} height={'100%'}>
            <Button
                onClick={() =>
                    setDeckTab((prev) => (prev === MainOrSide.MAIN ? MainOrSide.SIDEBOARD : MainOrSide.MAIN))
                }
            >
                {deckTab === MainOrSide.MAIN ? 'Go to Sideboard' : 'Go to Main Deck'}
            </Button>
            <Typography>
                {deck.name} -{' '}
                {deck.cards.reduce(
                    (acc, c) =>
                        acc +
                        (c.mainOrSide === (deckTab === MainOrSide.MAIN ? MainOrSide.MAIN : MainOrSide.SIDEBOARD)
                            ? c.count
                            : 0),
                    0,
                )}{' '}
                cards
            </Typography>
            <Typography>Commander</Typography>
            <Button fullWidth variant={'contained'} onClick={() => setSelectingCommander((prev) => !prev)}>
                <Typography>{selectingCommander ? 'Selecting a commander' : 'Click to select a commander'}</Typography>
            </Button>
            {commander && <DeckCard deckCard={commander} removeCard={handleRemoveCard} />}
            <Typography>{deckTab === MainOrSide.MAIN ? 'Main Deck' : 'Sideboard'}</Typography>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <Grid container>
                    {deckTab === MainOrSide.MAIN &&
                        sortedMainDeck.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    addOne={addOne}
                                    removeOne={removeOne}
                                    removeCard={handleRemoveCard}
                                    commander={commander}
                                />
                            </Grid>
                        ))}
                    {deckTab === MainOrSide.SIDEBOARD &&
                        sortedSideboard.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    addOne={addOne}
                                    removeOne={removeOne}
                                    removeCard={handleRemoveCard}
                                    commander={commander}
                                />
                            </Grid>
                        ))}
                </Grid>
            </Box>
            <Box mt={'auto'} display={'flex'} justifyContent={'space-between'}>
                <Button variant={'contained'} onClick={saveDeck}>
                    Save Deck
                </Button>
                <Button variant={'contained'} onClick={saveDeckAsCopy}>
                    Save Deck As Copy
                </Button>
            </Box>
        </Box>
    )
}
