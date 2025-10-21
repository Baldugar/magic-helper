import { Close } from '@mui/icons-material'
import { Box, Button, Divider, Grid, IconButton, Paper, Typography, useMediaQuery } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { sortBy } from 'lodash'
import { useMemo } from 'react'
import { PhantomNodeData } from '../../../components/deckBuilder/FlowCanvas/Nodes/PhantomNode'
import { useMTGDeckCreatorLogic } from '../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckCreatorUI } from '../../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'
import { useMTGDecks } from '../../../context/MTGA/Decks/useMTGDecks'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_DeckCard, MTG_DeckCardType, MTG_UpdateDeckInput } from '../../../graphql/types'
import { DRAWER_WIDTH_DESKTOP, DRAWER_WIDTH_MOBILE } from '../../../utils/constants'
import { calculateCardsFromNodes, calculateZonesFromNodes, NodeType } from '../../../utils/functions/nodeFunctions'
import { DeckCard } from './DeckCard'

/**
 * Drawer shows and manages the current deck list with commander, main, and sideboard.
 *
 * Actions
 * - Save deck / Save as copy
 * - Add/Remove cards and quantities
 * - Toggle between main and sideboard tabs
 * - Responsive fixed overlay on mobile
 */
export const Drawer = () => {
    const { setOpenDrawer } = useMTGDeckCreatorUI()
    const { deck, removeCard, addOne, removeOne } = useMTGDeckCreatorLogic()
    const { filter, setFilter } = useMTGFilter()
    const { getNodes, setNodes } = useReactFlow<NodeType>()
    const { reload: reloadDecks } = useMTGDecks()
    const isMobile = useMediaQuery('(max-width: 600px)')

    const {
        mutations: { updateMTGDeckMutation, saveMTGDeckAsCopyMutation },
    } = MTGFunctions

    const saveDeck = () => {
        if (!deck) return
        const nodes = getNodes()
        const deckInput: MTG_UpdateDeckInput = {
            cards: calculateCardsFromNodes(nodes, deck.cards),
            deckID: deck.ID,
            name: deck.name,
            type: deck.type,
            zones: calculateZonesFromNodes(nodes),
            cardFrontImage: deck.cardFrontImage
                ? {
                      cardID: deck.cardFrontImage.cardID,
                      versionID: deck.cardFrontImage.versionID,
                  }
                : undefined,
        }
        updateMTGDeckMutation(deckInput).then((resp) => {
            if (resp.status) {
                reloadDecks()
            }
        })
    }

    const saveDeckAsCopy = () => {
        if (!deck) return
        const nodes = getNodes()
        const deckInput: MTG_UpdateDeckInput = {
            cards: calculateCardsFromNodes(nodes, deck.cards),
            deckID: deck.ID,
            name: deck.name,
            type: deck.type,
            zones: calculateZonesFromNodes(nodes),
            cardFrontImage: deck.cardFrontImage
                ? {
                      cardID: deck.cardFrontImage.cardID,
                      versionID: deck.cardFrontImage.versionID,
                  }
                : undefined,
        }
        saveMTGDeckAsCopyMutation(deckInput)
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
        () => deck?.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER) || [],
        [deck],
    )
    const sortedMainDeck = sortBy(mainDeck, (c) => c.card.name)

    if (!deck) return null

    const commander = deck.cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
    // const companion = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMPANION)

    return (
        <Box
            width={isMobile ? DRAWER_WIDTH_MOBILE : DRAWER_WIDTH_DESKTOP}
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
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" component="div" sx={{ fontSize: '1.05rem' }}>
                                {deck.name}
                            </Typography>
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
                            — {deck.cards.reduce((acc, c) => acc + c.count, 0)} cards
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Deck Stats */}
            {isMobile && (
                <Paper elevation={0} sx={{ p: 0.5, mb: 0.5, mt: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: '0.98rem' }}>
                        Main Deck - {deck.cards.reduce((acc, c) => acc + c.count, 0)} cards
                    </Typography>
                </Paper>
            )}

            {/* Commander Section */}
            <Paper elevation={0} sx={{ p: 0, mb: isMobile ? 0.5 : 1, mt: isMobile ? 0 : 1 }}>
                <Button
                    fullWidth
                    variant={'contained'}
                    onClick={() =>
                        setFilter((prev) => ({ ...prev, isSelectingCommander: !prev.isSelectingCommander, page: 0 }))
                    }
                    sx={{
                        mb: isMobile ? 0.25 : 1,
                        py: isMobile ? 0.4 : undefined,
                        fontSize: isMobile ? '0.93rem' : undefined,
                    }}
                >
                    <Typography sx={{ fontSize: isMobile ? '0.93rem' : undefined }}>
                        {filter.isSelectingCommander
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
                    {sortedMainDeck.map((c) => (
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
