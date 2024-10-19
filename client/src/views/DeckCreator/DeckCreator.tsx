import { Box, Button, ButtonBase, Collapse, Grid, Pagination, Typography } from '@mui/material'
import { isEqual } from 'lodash'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MTGACardWithHover } from '../../components/MTGACardWithHover'
import { useMTGACards } from '../../context/MTGA/Cards/useMTGACards'
import { useMTGADecks } from '../../context/MTGA/Decks/useMTGADecks'
import { useMTGAFilter } from '../../context/MTGA/Filter/useMTGAFilter'
import { MTGAFunctions } from '../../graphql/MTGA/functions'
import {
    DeckCardPosition,
    DeckType,
    MTGA_Card,
    MTGA_Deck,
    MTGA_DeckCard,
    MTGA_DeckCardInput,
    MTGA_DeckCardType,
} from '../../graphql/types'
import { FlowView } from '../FlowView/FlowView'
import { DeckCard } from './Components/DeckCard'
import { Filters } from './Components/Filters'
import { filterCards } from './filterCards'

export const DeckCreator = () => {
    const { cards } = useMTGACards()
    const { decks } = useMTGADecks()
    const {
        filter,
        originalFilter,
        sort: { sortBy, sortDirection },
        // setSort,
    } = useMTGAFilter()
    const { deckID } = useParams()
    const [deck, setDeck] = useState<MTGA_Deck>()
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectingCommander, setSelectingCommander] = useState(false)
    const [viewMode, setViewMode] = useState<'catalogue' | 'board'>('catalogue')
    const [deckTab, setDeckTab] = useState<'main' | 'side'>('main')
    const commander = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMMANDER)
    // const companion = deck?.cards.find((c) => c.type === MTGA_DeckCardType.COMPANION)
    const mainDeck =
        deck?.cards.filter((c) => c.cardPosition === DeckCardPosition.MAIN && c.type !== MTGA_DeckCardType.COMMANDER) ||
        []
    const sideboard = deck?.cards.filter((c) => c.cardPosition === DeckCardPosition.SIDEBOARD) || []

    const [filteredCards, setFilteredCards] = useState<MTGA_Card[]>([])
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 100

    const onAddCard = (card: MTGA_Card) => {
        if (deck) {
            const newDeck = structuredClone(deck)
            if (selectingCommander) {
                // Remove the previous commander
                newDeck.cards = newDeck.cards.filter((c) => c.type !== MTGA_DeckCardType.COMMANDER)
                // Add the new commander
                newDeck.cards.push({
                    card,
                    count: 1,
                    type: MTGA_DeckCardType.COMMANDER,
                    cardPosition: DeckCardPosition.MAIN,
                    position: {
                        x: 0,
                        y: 0,
                    },
                })
                setSelectingCommander(false)
            } else {
                const cardPosition = deckTab === 'main' ? DeckCardPosition.MAIN : DeckCardPosition.SIDEBOARD
                const index = newDeck.cards.findIndex((c) => c.card.ID === card.ID && c.cardPosition === cardPosition)
                if (index !== -1) {
                    newDeck.cards[index].count++
                } else {
                    newDeck.cards.push({
                        card,
                        count: 1,
                        type: MTGA_DeckCardType.NORMAL,
                        cardPosition,
                        position: {
                            x: 0,
                            y: 0,
                        },
                    })
                }
            }
            console.log(newDeck)
            setDeck(newDeck)
        }
    }

    const addOne = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.cardPosition) {
            case DeckCardPosition.MAIN:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.MAIN,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count++
                    }
                }
                break
            case DeckCardPosition.SIDEBOARD:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.SIDEBOARD,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count++
                    }
                }
                break
        }
        setDeck(newDeck)
    }

    const removeOne = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.cardPosition) {
            case DeckCardPosition.MAIN:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.MAIN,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count--
                        if (newDeck.cards[index].count === 0) {
                            newDeck.cards.splice(index, 1)
                        }
                    }
                }
                if (deckCard.type === MTGA_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.type !== MTGA_DeckCardType.COMMANDER)
                }
                if (deckCard.type === MTGA_DeckCardType.COMPANION) {
                    newDeck.cards = newDeck.cards.filter((c) => c.type !== MTGA_DeckCardType.COMPANION)
                }
                break
            case DeckCardPosition.SIDEBOARD:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.SIDEBOARD,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count--
                        if (newDeck.cards[index].count === 0) {
                            newDeck.cards.splice(index, 1)
                        }
                    }
                }
                break
        }
        setDeck(newDeck)
    }

    const removeCard = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.cardPosition) {
            case DeckCardPosition.MAIN:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    newDeck.cards = newDeck.cards.filter(
                        (c) => !(c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.MAIN),
                    )
                }
                if (deckCard.type === MTGA_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.type !== MTGA_DeckCardType.COMMANDER)
                }
                if (deckCard.type === MTGA_DeckCardType.COMPANION) {
                    newDeck.cards = newDeck.cards.filter((c) => c.type !== MTGA_DeckCardType.COMPANION)
                }
                break
            case DeckCardPosition.SIDEBOARD:
                if (deckCard.type === MTGA_DeckCardType.NORMAL) {
                    newDeck.cards = newDeck.cards.filter(
                        (c) => !(c.card.ID === deckCard.card.ID && c.cardPosition === DeckCardPosition.SIDEBOARD),
                    )
                }
                break
        }
        setDeck(newDeck)
    }

    useEffect(() => {
        if (!isEqual(filter, originalFilter) || selectingCommander) {
            setFilteredCards(filterCards(cards, filter, sortBy, sortDirection, selectingCommander))
        } else {
            setFilteredCards(cards)
        }
    }, [filter, sortBy, sortDirection, cards, originalFilter, selectingCommander])

    useEffect(() => {
        if (deckID) {
            const foundDeck = decks.find((d) => d.ID === deckID)
            if (foundDeck) {
                setDeck(foundDeck)
            }
        }
    }, [deckID, decks])

    const {
        mutations: { updateMTGADeck },
    } = MTGAFunctions

    return (
        <Box display={'flex'} maxHeight={'100vh'}>
            <Box position={'relative'} flex={1} display={'flex'} flexDirection={'column'}>
                <h1>Deck Creator - {viewMode}</h1>
                {viewMode === 'catalogue' && (
                    <>
                        <Filters />
                        <Grid
                            container
                            onWheel={(e) => {
                                const hasVerticalScrollbar = e.currentTarget.scrollHeight > e.currentTarget.clientHeight
                                if (hasVerticalScrollbar && !e.shiftKey) return
                                if (e.deltaY > 0 && page < Math.floor(filteredCards.length / PAGE_SIZE)) {
                                    setPage(page + 1)
                                }
                                if (e.deltaY < 0 && page > 0) {
                                    setPage(page - 1)
                                }
                            }}
                            sx={{
                                overflowY: 'auto',
                                flex: 1,
                            }}
                        >
                            {filteredCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((card) => (
                                <Grid item key={card.ID} xs={'auto'}>
                                    <ButtonBase onClick={() => onAddCard(card)}>
                                        <MTGACardWithHover card={card} />
                                    </ButtonBase>
                                </Grid>
                            ))}
                        </Grid>
                        <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                            <Pagination
                                count={Math.floor(filteredCards.length / PAGE_SIZE) + 1}
                                page={page + 1}
                                onChange={(_, page) => {
                                    setPage(page - 1)
                                }}
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    </>
                )}
                {viewMode === 'board' && <FlowView />}
                <Box position={'absolute'} top={10} right={10}>
                    <button onClick={() => setOpenDrawer(!openDrawer)}>Open Drawer</button>
                    <button onClick={() => setViewMode((prev) => (prev === 'board' ? 'catalogue' : 'board'))}>
                        Change View
                    </button>
                </Box>
            </Box>
            {deck && (
                <Collapse in={openDrawer} orientation={'horizontal'}>
                    <Box width={500} display={'flex'} flexDirection={'column'} maxHeight={'100vh'} height={'100%'}>
                        <Button onClick={() => setDeckTab((prev) => (prev === 'main' ? 'side' : 'main'))}>
                            {deckTab === 'main' ? 'Go to Sideboard' : 'Go to Main Deck'}
                        </Button>
                        <Typography>{deck.name}</Typography>
                        {(deck.type === DeckType.BRAWL_60 || deck.type === DeckType.BRAWL_100) && (
                            <>
                                <Typography>Commander</Typography>
                                <Button
                                    fullWidth
                                    variant={'contained'}
                                    onClick={() => setSelectingCommander((prev) => !prev)}
                                >
                                    <Typography>
                                        {selectingCommander ? 'Selecting a commander' : 'Click to select a commander'}
                                    </Typography>
                                </Button>
                                {commander && <MTGACardWithHover card={commander.card} />}
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
                            <Button
                                variant={'contained'}
                                onClick={() => {
                                    updateMTGADeck({
                                        cards: deck.cards.map(
                                            (c) =>
                                                ({
                                                    count: c.count,
                                                    type: c.type,
                                                    cardPosition: c.cardPosition,
                                                    card: c.card.ID,
                                                    position: c.position,
                                                } as MTGA_DeckCardInput),
                                        ),
                                        deckID: deck.ID,
                                        name: deck.name,
                                        type: deck.type,
                                        zones: deck.zones,
                                        cardFrontImage: deck.cardFrontImage,
                                    })
                                }}
                            >
                                Save Deck
                            </Button>
                        </Box>
                    </Box>
                </Collapse>
            )}
        </Box>
    )
}
