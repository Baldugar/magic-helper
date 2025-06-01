import { ArrowLeft, BarChart, DashboardCustomize, Edit, VerticalSplit, ViewCompact } from '@mui/icons-material'
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
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CardPackageImportDialog } from '../../components/CardPackageImportDialog'
import { ExportDialog } from '../../components/ExportDialog'
import { ImportDialog } from '../../components/ImportDialog'
import { DndProvider } from '../../context/DnD/DnDProvider'
import { useMTGCards } from '../../context/MTGA/Cards/useMTGCards'
import { MTGDeckCreatorProvider } from '../../context/MTGA/DeckCreator/MTGDeckCreatorProvider'
import { useMTGDeckCreator } from '../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTGDeckCreatorFlowProvider } from '../../context/MTGA/DeckCreatorFlow/MTGDeckCreatorFlowProvider'
import { MTGDeckCreatorPaginationProvider } from '../../context/MTGA/DeckCreatorPagination/MTGDeckCreatorPaginationProvider'
import { useMTGDeckCreatorPagination } from '../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGDecks } from '../../context/MTGA/Decks/useMTGDecks'
import { MTGAFilterProvider } from '../../context/MTGA/Filter/MTGFilterProvider'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../graphql/MTGA/functions'
import { MTG_UpdateDeckInput } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'
import { DRAWER_WIDTH_DESKTOP, DRAWER_WIDTH_MOBILE, PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../utils/constants'
import { calculateNewDeck } from '../../utils/functions/deckFunctions'
import { calculateCardsFromNodes, calculateZonesFromNodes } from '../../utils/functions/nodeFunctions'
import { useLocalStoreFilter } from '../../utils/hooks/useLocalStoreFilter'
import { FlowView } from '../FlowView/FlowView'
import { CardsGrid } from './Components/CardsGrid'
import { DeckCreatorPiles } from './Components/DeckCreatorPiles'
import { Drawer } from './Components/Drawer'
import { Filters } from './Components/Filters'

export const DeckCreator = () => {
    const { cards } = useMTGCards()
    const {
        deck,
        openDrawer,
        setOpenDrawer,
        setViewMode,
        viewMode,
        setOpenImportDialog,
        setOpenExportDialog,
        setDeck,
        setOpenImportCardPackageDialog,
    } = useMTGDeckCreator()
    const { updateDeck } = useMTGDecks()
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { loadLocalStoreFilter, saveLocalStoreFilter } = useLocalStoreFilter()
    const { clearFilter } = useMTGFilter()
    const { getNodes } = useReactFlow()
    const {
        mutations: { updateMTGDeck },
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
                            <Filters />
                            <CardsGrid />
                            <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                                <Pagination
                                    count={Math.floor(filteredCards.length / pageSize) + 1}
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
                    {viewMode === 'BOARD' && (
                        <Box flex={1} height={'100%'}>
                            <FlowView />
                        </Box>
                    )}
                    {viewMode === 'CATALOGUE_BOARD' && (
                        <Box flex={1} height={'100%'} display={'flex'} overflow={'hidden'}>
                            <Box flex={1} display={'flex'} flexDirection={'column'} height={'100%'}>
                                <Filters />
                                <CardsGrid />
                                <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                                    <Pagination
                                        count={Math.floor(filteredCards.length / pageSize) + 1}
                                        page={page + 1}
                                        onChange={(_, page) => {
                                            setPage(page - 1)
                                        }}
                                        showFirstButton
                                        showLastButton
                                    />
                                </Box>
                            </Box>
                            <Box flex={1} height={'100%'}>
                                <FlowView />
                            </Box>
                        </Box>
                    )}
                    {viewMode === 'PILES' && (
                        <Box flex={1} height={'100%'} maxWidth={'100vw'} overflow={'hidden'}>
                            <DeckCreatorPiles />
                        </Box>
                    )}
                    {viewMode === 'CATALOGUE_PILES' && (
                        <Box flex={1} height={'100%'} display={'flex'} overflow={'hidden'} width={'100%'}>
                            <Box
                                flex={0.4}
                                display={'flex'}
                                flexDirection={'column'}
                                height={'100%'}
                                sx={{ borderRight: '1px solid lightgray' }}
                            >
                                <Filters />
                                <CardsGrid />
                                <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                                    <Pagination
                                        count={Math.floor(filteredCards.length / pageSize) + 1}
                                        page={page + 1}
                                        onChange={(_, page) => {
                                            setPage(page - 1)
                                        }}
                                        showFirstButton
                                        showLastButton
                                    />
                                </Box>
                            </Box>
                            <Box flex={0.6} height={'100%'} width={'100%'}>
                                <DeckCreatorPiles />
                            </Box>
                        </Box>
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
                            <MenuItem
                                onClick={() => {
                                    setOpenImportCardPackageDialog(true)
                                    handleMenuClose()
                                }}
                            >
                                Import Card Package
                            </MenuItem>
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
                                <Grid item xs={6} md={'auto'}>
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
                                </Grid>
                            </Grid>
                            <MenuItem
                                onClick={() => {
                                    handleChangeView(viewMode === 'CATALOGUE' ? 'BOARD' : 'CATALOGUE')
                                    handleMenuClose()
                                }}
                            >
                                Change View
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    handleChangeView('CATALOGUE_BOARD')
                                    handleMenuClose()
                                }}
                            >
                                Both View
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
                <CardPackageImportDialog />
            </Box>
        </MTGDeckCreatorFlowProvider>
    )
}

export const DeckCreatorWrapper = () => {
    const { deckID } = useParams()

    return (
        <ReactFlowProvider>
            <MTGAFilterProvider>
                <MTGDeckCreatorProvider deckID={deckID}>
                    <DndProvider>
                        <MTGDeckCreatorPaginationProvider>
                            <DeckCreator />
                        </MTGDeckCreatorPaginationProvider>
                    </DndProvider>
                </MTGDeckCreatorProvider>
            </MTGAFilterProvider>
        </ReactFlowProvider>
    )
}
