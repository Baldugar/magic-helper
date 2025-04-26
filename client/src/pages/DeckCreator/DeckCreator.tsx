import MenuIcon from '@mui/icons-material/Menu'
import { Box, Button, Collapse, Divider, IconButton, Menu, MenuItem, Pagination, Typography } from '@mui/material'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import React from 'react'
import { useParams } from 'react-router-dom'
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
import { PAGE_SIZE } from '../../utils/constants'
import { calculateNewDeck } from '../../utils/functions/deckFunctions'
import { calculateCardsFromNodes, calculateZonesFromNodes } from '../../utils/functions/nodeFunctions'
import { useLocalStoreFilter } from '../../utils/hooks/useLocalStoreFilter'
import { FlowView } from '../FlowView/FlowView'
import { CardsGrid } from './Components/CardsGrid'
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
        mutations: { updateMTGDeck: updateMTGADeck },
    } = MTGFunctions
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const handleChangeView = (newViewMode: 'catalogue' | 'board' | 'both') => {
        if (viewMode === 'board' || viewMode === 'both') {
            calculateNewDeck(cards, deck, getNodes, setDeck)
        }
        setViewMode(newViewMode)
    }

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
        updateMTGADeck(deckInput).then((deck) => {
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
            <Box display={'flex'} maxHeight={'100vh'}>
                <Box position={'relative'} flex={1} display={'flex'} flexDirection={'column'} height={'100vh'}>
                    <h1>Deck Creator - {viewMode}</h1>
                    {viewMode === 'catalogue' && (
                        <>
                            <Filters />
                            <CardsGrid />
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
                    {viewMode === 'board' && (
                        <Box flex={1} height={'100%'}>
                            <FlowView />
                        </Box>
                    )}
                    {viewMode === 'both' && (
                        <Box flex={1} height={'100%'} display={'flex'} overflow={'hidden'}>
                            <Box flex={1} display={'flex'} flexDirection={'column'} height={'100%'}>
                                <Filters />
                                <CardsGrid />
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
                            </Box>
                            <Box flex={1} height={'100%'}>
                                <FlowView />
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
                            <MenuItem
                                onClick={() => {
                                    handleChangeView(viewMode === 'catalogue' ? 'board' : 'catalogue')
                                    handleMenuClose()
                                }}
                            >
                                Change View
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    handleChangeView('both')
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
                <Collapse in={openDrawer} orientation={'horizontal'}>
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
