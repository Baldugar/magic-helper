import { Box, Button, Grid, Typography } from '@mui/material'
import { sortBy } from 'lodash'
import { useMemo } from 'react'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { useMTGADeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGADeckFlowCreator'
import { MTGAFunctions } from '../../../graphql/MTGA/functions'
import { DeckType, MainOrSide, MTGA_DeckCard, MTGA_DeckCardType } from '../../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes } from '../../../utils/functions/nodeFunctions'
import { DeckCard } from './DeckCard'

export const Drawer = () => {
    const { deckTab, setDeckTab, deck, selectingCommander, setSelectingCommander, removeCard } = useMTGADeckCreator()
    const { nodes, setNodes } = useMTGADeckFlowCreator()

    const {
        mutations: { updateMTGADeck },
    } = MTGAFunctions

    const saveDeck = () => {
        if (!deck) return
        const deckInput = {
            cards: calculateCardsFromNodes(nodes),
            deckID: deck.ID,
            name: deck.name,
            type: deck.type,
            zones: calculateZonesFromNodes(nodes),
            cardFrontImage: deck.cardFrontImage,
        }
        updateMTGADeck(deckInput)
    }

    const handleRemoveCard = (deckCard: MTGA_DeckCard) => {
        removeCard(deckCard)
        if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(deckCard.card.ID)))
    }
    const mainDeck = useMemo(
        () =>
            deck?.cards.filter(
                (c) => c.mainOrSide === MainOrSide.MAIN && c.deckCardType !== MTGA_DeckCardType.COMMANDER,
            ) || [],
        [deck],
    )
    const sideboard = useMemo(() => deck?.cards.filter((c) => c.mainOrSide === MainOrSide.SIDEBOARD) || [], [deck])
    const sortedMainDeck = sortBy(mainDeck, (c) => c.card.name)
    const sortedSideboard = sortBy(sideboard, (c) => c.card.name)

    if (!deck) return null

    const commander = deck.cards.find((c) => c.deckCardType === MTGA_DeckCardType.COMMANDER)
    // const companion = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMPANION)

    return (
        <Box width={500} display={'flex'} flexDirection={'column'} maxHeight={'100vh'} height={'100%'}>
            <Button onClick={() => setDeckTab((prev) => (prev === 'main' ? 'side' : 'main'))}>
                {deckTab === 'main' ? 'Go to Sideboard' : 'Go to Main Deck'}
            </Button>
            <Typography>{deck.name}</Typography>
            {(deck.type === DeckType.BRAWL_60 || deck.type === DeckType.BRAWL_100) && (
                <>
                    <Typography>Commander</Typography>
                    <Button fullWidth variant={'contained'} onClick={() => setSelectingCommander((prev) => !prev)}>
                        <Typography>
                            {selectingCommander ? 'Selecting a commander' : 'Click to select a commander'}
                        </Typography>
                    </Button>
                    {commander && <DeckCard deckCard={commander} removeCard={handleRemoveCard} />}
                </>
            )}
            <Typography>{deckTab === 'main' ? 'Main Deck' : 'Sideboard'}</Typography>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <Grid container>
                    {deckTab === 'main' &&
                        sortedMainDeck.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    // addOne={deck.type === DeckType.STANDARD ? addOne : undefined}
                                    // removeOne={deck.type === DeckType.STANDARD ? removeOne : undefined}
                                    removeCard={handleRemoveCard}
                                    commander={commander}
                                />
                            </Grid>
                        ))}
                    {deckTab === 'side' &&
                        sortedSideboard.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    // addOne={deck.type === DeckType.STANDARD ? addOne : undefined}
                                    // removeOne={deck.type === DeckType.STANDARD ? removeOne : undefined}
                                    removeCard={handleRemoveCard}
                                    commander={commander}
                                />
                            </Grid>
                        ))}
                </Grid>
            </Box>
            <Box mt={'auto'}>
                <Button variant={'contained'} onClick={saveDeck}>
                    Save Deck
                </Button>
            </Box>
        </Box>
    )
}
