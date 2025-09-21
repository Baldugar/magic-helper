import { ArrowLeft, DashboardCustomize, Edit, VerticalSplit, ViewCompact } from '@mui/icons-material'
import MenuIcon from '@mui/icons-material/Menu'
import {
    Box,
    Button,
    Collapse,
    Divider,
    Grid,
    IconButton,
    Menu,
    MenuItem,
    Pagination,
    Typography,
    useMediaQuery,
} from '@mui/material'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PackagesDialog } from '../../components/deckBuilder/PackagesDialog/PackagesDialog'
import { ExportDialog } from '../../components/ExportDialog'
import { ImportDialog } from '../../components/ImportDialog'
import { DndProvider } from '../../context/DnD/DnDProvider'
import { MTGCardsProvider } from '../../context/MTGA/Cards/MTGCardsProvider'
import { useMTGCards } from '../../context/MTGA/Cards/useMTGCards'
import { MTGDeckCreatorProvider } from '../../context/MTGA/DeckCreator/MTGDeckCreatorProvider'
import { useMTGDeckCreator } from '../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTGDeckCreatorFlowProvider } from '../../context/MTGA/DeckCreatorFlow/MTGDeckCreatorFlowProvider'
import { useMTGDecks } from '../../context/MTGA/Decks/useMTGDecks'
import { MTGAFilterProvider } from '../../context/MTGA/Filter/MTGFilterProvider'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTGTagsProvider } from '../../context/MTGA/Tags/MTGTagsProvider'
import { MTGFunctions } from '../../graphql/MTGA/functions'
import { MTG_Deck, MTG_UpdateDeckInput } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'
import { DRAWER_WIDTH_DESKTOP, DRAWER_WIDTH_MOBILE, PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../utils/constants'
import { calculateNewDeck } from '../../utils/functions/deckFunctions'
import { useLocalStoreFilter } from '../../utils/hooks/useLocalStoreFilter'
import { CardDialog } from './Components/CardDialog'
import { CardsGrid } from './Components/CardsGrid'
import { Drawer } from './Components/Drawer'
import { FilterBar } from '../../components/deckBuilder/FilterBar/FilterBar'

/**
 * DeckCreator renders the full deck editing experience.
 *
 * Features
 * - Switchable views: Catalogue, Catalogue+Board split, Board-only
 * - Filter and pagination controls for card catalogue
 * - Deck operations: save, import/export, card package import
 * - Responsive layout with a collapsible drawer for deck management
 */
export const DeckCreator = () => {
    const { cards, totalCount } = useMTGCards()
    const {
        deck,
        setDeck,
        openDrawer,
        setOpenDrawer,
        setViewMode,
        viewMode,
        setOpenImportDialog,
        setOpenExportDialog,
        setOpenImportCardPackageDialog,
    } = useMTGDeckCreator()
    const { propagateChangesToDashboardDeck } = useMTGDecks()
    const { filter, setFilter } = useMTGFilter()

    console.log(filter)

    const { loadLocalStoreFilter, saveLocalStoreFilter } = useLocalStoreFilter()
    const { clearFilter } = useMTGFilter()
    const { getNodes } = useReactFlow()
    const {
        mutations: { updateMTGDeckMutation },
    } = MTGFunctions
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

    const handleChangeView = (newViewMode: DeckCreatorView) => {
        if (viewMode === 'BOARD' || viewMode === 'CATALOGUE_BOARD') {
            calculateNewDeck(cards, deck, getNodes, setDeck)
        }
        setViewMode(newViewMode)
    }

    const navigate = useNavigate()

    const saveDeck = () => {
        if (!deck) return
        const deckInput: MTG_UpdateDeckInput = {
            cards: deck.cards.map((c) => ({
                card: c.card.ID,
                count: c.count,
                deckCardType: c.deckCardType,
                mainOrSide: c.mainOrSide,
                phantoms: c.phantoms,
                position: c.position,
                ID: c.card.ID,
            })),
            deckID: deck.ID,
            name: deck.name,
            zones: deck.zones,
            cardFrontImage: deck.cardFrontImage,
        }
        updateMTGDeckMutation(deckInput).then((resp) => {
            if (resp.status) {
                propagateChangesToDashboardDeck(deck)
            }
        })
    }

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    if (!deck) return null

    return (
        <MTGDeckCreatorFlowProvider deck={deck}>
            <Box display={'flex'}>
                <Box
                    position={'relative'}
                    flex={1}
                    display={'flex'}
                    flexDirection={'column'}
                    height={viewMode === 'BOARD' ? '100vh' : { xs: '150vh', lg: '100vh' }}
                    width={isMobile ? DRAWER_WIDTH_MOBILE : `calc(100vw - ${DRAWER_WIDTH_DESKTOP}px)`}
                >
                    <Box
                        display={'flex'}
                        gap={1}
                        alignItems={isMobile ? 'flex-start' : 'center'}
                        paddingLeft={1}
                        flexDirection={isMobile ? 'column' : 'row'}
                    >
                        <Button variant={'contained'} color={'primary'} onClick={() => navigate(-1)}>
                            <ArrowLeft fontSize={'large'} />
                        </Button>
                        <Box display={'flex'} gap={1} alignItems={'center'}>
                            <h1>
                                Deck Creator - {viewMode} - {deck.name}
                            </h1>
                            <IconButton
                                onClick={() => {
                                    const prompt = window.prompt('Enter a new name for the deck')
                                    if (!prompt) return
                                    setDeck({ ...deck, name: prompt })
                                }}
                            >
                                <Edit />
                            </IconButton>
                        </Box>
                    </Box>
                    {viewMode === 'CATALOGUE' && (
                        <>
                            <FilterBar />
                            <CardsGrid />
                            <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                                <Pagination
                                    count={Math.floor(totalCount / pageSize) + 1}
                                    page={filter.page + 1}
                                    onChange={(_, page) => {
                                        setFilter((prev) => ({ ...prev, page: page - 1 }))
                                    }}
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        </>
                    )}
                    <Box position={'absolute'} top={10} right={10} display={'flex'} gap={1}>
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            onClick={handleMenuClick}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleMenuClose}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <Typography variant="caption" display="block" gutterBottom>
                                View Options
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6} md={'auto'}>
                                    <Box display={'flex'} justifyContent={'center'}>
                                        <IconButton onClick={() => handleChangeView('CATALOGUE')}>
                                            <ViewCompact />
                                        </IconButton>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={'auto'}>
                                    <Box display={'flex'} justifyContent={'center'}>
                                        <IconButton onClick={() => handleChangeView('CATALOGUE_BOARD')}>
                                            <VerticalSplit />
                                        </IconButton>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={'auto'}>
                                    <Box display={'flex'} justifyContent={'center'}>
                                        <IconButton onClick={() => handleChangeView('BOARD')}>
                                            <DashboardCustomize />
                                        </IconButton>
                                    </Box>
                                </Grid>
                                {/* <Grid item xs={6} md={'auto'}>
                                    <Box display={'flex'} justifyContent={'center'}>
                                        <IconButton onClick={() => handleChangeView('CATALOGUE_PILES')}>
                                            <VerticalSplit />
                                        </IconButton>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={'auto'}>
                                    <Box display={'flex'} justifyContent={'center'}>
                                        <IconButton onClick={() => handleChangeView('PILES')}>
                                            <BarChart />
                                        </IconButton>
                                    </Box>
                                </Grid> */}
                            </Grid>
                            <Divider />
                            <Typography variant="caption" display="block" gutterBottom>
                                Deck Operations
                            </Typography>
                            <MenuItem
                                onClick={() => {
                                    saveDeck()
                                    handleMenuClose()
                                }}
                            >
                                Save Deck
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenImportDialog(true)
                                    handleMenuClose()
                                }}
                            >
                                Import Deck
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenExportDialog(true)
                                    handleMenuClose()
                                }}
                            >
                                Export Deck
                            </MenuItem>
                            <Divider />
                            <Typography variant="caption" display="block" gutterBottom>
                                Filter Operations
                            </Typography>
                            <MenuItem
                                onClick={() => {
                                    clearFilter()
                                    handleMenuClose()
                                }}
                            >
                                Clear filter
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    saveLocalStoreFilter()
                                    handleMenuClose()
                                }}
                            >
                                Save filter
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    loadLocalStoreFilter()
                                    handleMenuClose()
                                }}
                            >
                                Load filter
                            </MenuItem>
                            <Divider />
                            <MenuItem
                                onClick={() => {
                                    setOpenImportCardPackageDialog(true)
                                    handleMenuClose()
                                }}
                            >
                                Import Card Package
                            </MenuItem>
                        </Menu>
                        <Button variant={'contained'} color={'primary'} onClick={() => setOpenDrawer(!openDrawer)}>
                            Open Drawer
                        </Button>
                    </Box>
                </Box>
                <Collapse in={openDrawer} orientation={'horizontal'} mountOnEnter unmountOnExit>
                    <Drawer />
                </Collapse>
                <ImportDialog />
                <ExportDialog />
                <PackagesDialog />
                <CardDialog />
            </Box>
        </MTGDeckCreatorFlowProvider>
    )
}

/**
 * DeckCreatorWrapper resolves the deck by ID and wires required providers.
 *
 * Providers
 * - Tags, Filters, Cards, ReactFlow, DeckCreator, DnD
 *
 * This isolation prevents remounting the editor when higher-level context changes.
 */
export const DeckCreatorWrapper = () => {
    const { deckID } = useParams()

    const {
        queries: { getMTGDeckQuery },
    } = MTGFunctions
    const [deck, setDeck] = useState<MTG_Deck>()

    useEffect(() => {
        if (!deckID || !!deck) return
        getMTGDeckQuery(deckID).then((deck) => {
            setDeck(deck)
        })
    }, [deckID, deck, getMTGDeckQuery])

    if (!deck) return null

    return (
        <MTGTagsProvider>
            <MTGAFilterProvider>
                <MTGCardsProvider>
                    <ReactFlowProvider>
                        <MTGDeckCreatorProvider initialDeck={deck}>
                            <DndProvider>
                                <DeckCreator />
                            </DndProvider>
                        </MTGDeckCreatorProvider>
                    </ReactFlowProvider>
                </MTGCardsProvider>
            </MTGAFilterProvider>
        </MTGTagsProvider>
    )
}
