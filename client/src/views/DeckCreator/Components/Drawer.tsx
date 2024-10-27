import { Box, Button, Grid, Typography } from '@mui/material'
import { Node } from '@xyflow/react'
import { MutableRefObject } from 'react'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { MTGAFunctions } from '../../../graphql/MTGA/functions'
import { DeckType, MainOrSide, MTGA_DeckCardType } from '../../../graphql/types'
import { calculateCardsFromNodes } from '../../FlowView/functions'
import { DeckCard } from './DeckCard'

export type DrawerProps = {
    nodes: MutableRefObject<Node[]>
}

export const Drawer = (props: DrawerProps) => {
    const { nodes } = props

    const { deckTab, setDeckTab, deck, selectingCommander, setSelectingCommander, addOne, removeCard, removeOne } =
        useMTGADeckCreator()

    const {
        mutations: { updateMTGADeck },
    } = MTGAFunctions

    const saveDeck = () => {
        if (!deck) return
        const deckInput = {
            cards: calculateCardsFromNodes(nodes.current),
            deckID: deck.ID,
            name: deck.name,
            type: deck.type,
            zones: deck.zones,
            cardFrontImage: deck.cardFrontImage,
        }
        console.log('deckInput', deckInput)
        updateMTGADeck(deckInput)
    }

    const commander = deck?.cards.find((c) => c.deckCardType === MTGA_DeckCardType.COMMANDER)
    // const companion = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMPANION)
    const mainDeck =
        deck?.cards.filter((c) => c.mainOrSide === MainOrSide.MAIN && c.deckCardType !== MTGA_DeckCardType.COMMANDER) ||
        []
    const sideboard = deck?.cards.filter((c) => c.mainOrSide === MainOrSide.SIDEBOARD) || []

    if (!deck) return null

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
                    {commander && <DeckCard deckCard={commander} removeCard={removeCard} />}
                </>
            )}
            <Typography>{deckTab === 'main' ? 'Main Deck' : 'Sideboard'}</Typography>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <Grid container>
                    {deckTab === 'main' &&
                        mainDeck.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    addOne={deck.type === DeckType.STANDARD ? addOne : undefined}
                                    removeOne={deck.type === DeckType.STANDARD ? removeOne : undefined}
                                    removeCard={removeCard}
                                />
                            </Grid>
                        ))}
                    {deckTab === 'side' &&
                        sideboard.map((c) => (
                            <Grid xs={12} item key={c.card.ID}>
                                <DeckCard
                                    deckCard={c}
                                    addOne={deck.type === DeckType.STANDARD ? addOne : undefined}
                                    removeOne={deck.type === DeckType.STANDARD ? removeOne : undefined}
                                    removeCard={removeCard}
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
