import { Close } from '@mui/icons-material'
import { Box, Button, Divider, Grid, IconButton, Paper, Typography, useMediaQuery } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { sortBy } from 'lodash'
import { useMemo } from 'react'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_DeckCard, MTG_DeckCardType, MTG_UpdateDeckInput } from '../../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes, NodeType } from '../../../utils/functions/nodeFunctions'
import { PhantomNodeData } from '../../FlowView/Nodes/PhantomNode'
import { DeckCard } from './DeckCard'

export const Drawer = () => {
    const {
        deckTab,
        setDeckTab,
        deck,
        selectingCommander,
        setSelectingCommander,
        removeCard,
        addOne,
        removeOne,
        setOpenDrawer,
    } = useMTGDeckCreator()
    const { getNodes, setNodes } = useReactFlow<NodeType>()
    const { updateDeck } = useMTGDecks()
    const isMobile = useMediaQuery('(max-width: 600px)')

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
            cardFrontImage: deck.cardFrontImage
                ? {
                      cardID: deck.cardFrontImage.ID,
                      versionID: deck.cardFrontImage.versions[0].ID,
                  }
                : undefined,
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
            cardFrontImage: deck.cardFrontImage
                ? {
                      cardID: deck.cardFrontImage.ID,
                      versionID: deck.cardFrontImage.versions[0].ID,
                  }
                : undefined,
            ignoredCards: deck.ignoredCards,
        }
        saveMTGDeckAsCopy(deckInput)
    }

    const handleRemoveCard = (deckCard: MTG_DeckCard) => {
        removeCard(deckCard.card)
        if (setNodes)
            setNodes((prev) =>
                // Remove the card node and all phantom nodes that have phantomOf as the card ID
                prev.filter(
                    (n) =>
                        !n.id.startsWith(deckCard.card.ID) &&
                        (n.type !== 'phantomNode' ||
                            (n.type === 'phantomNode' && (n.data as PhantomNodeData).phantomOf !== deckCard.card.ID)),
                ),
            )
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
        <Box
            width={isMobile ? '100vw' : 500}
            display={'flex'}
            flexDirection={'column'}
            maxHeight={'100vh'}
            height={'100%'}
            position={isMobile ? 'fixed' : 'relative'}
            top={isMobile ? 0 : 'auto'}
            left={isMobile ? 0 : 'auto'}
            zIndex={isMobile ? 1200 : 'auto'}
            bgcolor={isMobile ? 'background.paper' : 'transparent'}
        >
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mb: isMobile ? 0.5 : 0,
                }}
            >
                {isMobile ? (
                    <>
                        <Typography variant="subtitle1" component="div" sx={{ fontSize: '1.05rem' }}>
                            {deck.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                    setDeckTab((prev) =>
                                        prev === MainOrSide.MAIN ? MainOrSide.SIDEBOARD : MainOrSide.MAIN,
                                    )
                                }
                                sx={{ fontSize: '0.9rem', minWidth: 'auto' }}
                            >
                                {deckTab === MainOrSide.MAIN ? 'Sideboard' : 'Main'}
                            </Button>
                            <IconButton onClick={() => setOpenDrawer(false)} size="small">
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>
                    </>
                ) : (
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                        <Typography variant="h6" component="div">
                            {deck.name}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            —{' '}
                            {deck.cards.reduce(
                                (acc, c) =>
                                    acc +
                                    (c.mainOrSide ===
                                    (deckTab === MainOrSide.MAIN ? MainOrSide.MAIN : MainOrSide.SIDEBOARD)
                                        ? c.count
                                        : 0),
                                0,
                            )}{' '}
                            cards
                        </Typography>
                        <Box sx={{ ml: 'auto' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                    setDeckTab((prev) =>
                                        prev === MainOrSide.MAIN ? MainOrSide.SIDEBOARD : MainOrSide.MAIN,
                                    )
                                }
                            >
                                {deckTab === MainOrSide.MAIN ? 'Go to Sideboard' : 'Go to Main Deck'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>

            {/* Deck Stats */}
            {isMobile && (
                <Paper elevation={0} sx={{ p: 0.5, mb: 0.5, mt: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: '0.98rem' }}>
                        {deckTab === MainOrSide.MAIN ? 'Main Deck' : 'Sideboard'} -{' '}
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
                </Paper>
            )}

            {/* Commander Section */}
            <Paper elevation={0} sx={{ p: 0, mb: isMobile ? 0.5 : 1, mt: isMobile ? 0 : 1 }}>
                <Button
                    fullWidth
                    variant={'contained'}
                    onClick={() => setSelectingCommander((prev) => !prev)}
                    sx={{
                        mb: isMobile ? 0.25 : 1,
                        py: isMobile ? 0.4 : undefined,
                        fontSize: isMobile ? '0.93rem' : undefined,
                    }}
                >
                    <Typography sx={{ fontSize: isMobile ? '0.93rem' : undefined }}>
                        {selectingCommander
                            ? 'Selecting a commander'
                            : `Click to ${commander ? 'change the' : 'select a'} commander`}
                    </Typography>
                </Button>
                {commander && (
                    <Box sx={{ px: 0, py: 0 }}>
                        <DeckCard deckCard={commander} removeCard={handleRemoveCard} compact={isMobile} />
                    </Box>
                )}
            </Paper>

            {!isMobile && <Divider sx={{ mb: 0.5 }} />}
            {/* Cards List */}
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <Grid container spacing={1}>
                    {(deckTab === MainOrSide.MAIN ? sortedMainDeck : sortedSideboard).map((c) => (
                        <Grid xs={12} item key={c.card.ID}>
                            <DeckCard
                                deckCard={c}
                                addOne={addOne}
                                removeOne={removeOne}
                                removeCard={handleRemoveCard}
                                commander={commander}
                                compact={isMobile}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Footer Actions */}
            <Paper
                elevation={2}
                sx={{
                    p: 0,
                    mt: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Button variant={'contained'} onClick={saveDeck}>
                    Save Deck
                </Button>
                <Button variant={'contained'} onClick={saveDeckAsCopy}>
                    Save Deck As Copy
                </Button>
            </Paper>
        </Box>
    )
}
