import { ArrowLeft, DashboardCustomize, Edit, ViewCompact } from '@mui/icons-material'
import MenuIcon from '@mui/icons-material/Menu'
import {
    Box,
    Button,
    Collapse,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    Menu,
    MenuItem,
    Pagination,
    Switch,
    TextField,
    Typography,
    useMediaQuery,
} from '@mui/material'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FilterBar } from '../../components/deckBuilder/FilterBar/FilterBar'
import { ManageTagsDialog } from '../../components/deckBuilder/FilterBar/TagDialogs/ManageTagsDialog'
import { FlowCanvas } from '../../components/deckBuilder/FlowCanvas/FlowCanvas'
import { ExportDialog } from '../../components/deckBuilder/ImportExportDialog/ExportDialog'
import { ImportDialog } from '../../components/deckBuilder/ImportExportDialog/ImportDialog'
import { MTGCardsProvider } from '../../context/MTGA/Cards/MTGCardsProvider'
import { useMTGCards } from '../../context/MTGA/Cards/useMTGCards'
import { MTGDeckCreatorLogicProvider } from '../../context/MTGA/DeckCreator/Logic/MTGDeckCreatorLogicProvider'
import { useMTGDeckCreatorLogic } from '../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { MTGDeckCreatorUIProvider } from '../../context/MTGA/DeckCreator/UI/MTGDeckCreatorUIProvider'
import { useMTGDeckCreatorUI } from '../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'
import { MTGDeckCreatorFlowProvider } from '../../context/MTGA/DeckCreatorFlow/MTGDeckCreatorFlowProvider'
import { useMTGDecks } from '../../context/MTGA/Decks/useMTGDecks'
import { MTGAFilterProvider } from '../../context/MTGA/Filter/MTGFilterProvider'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../graphql/MTGA/functions'
import { MTG_Deck, MTG_UpdateDeckInput } from '../../graphql/types'
import { DeckCreatorView } from '../../types/deckCreatorView'
import { DRAWER_WIDTH_DESKTOP, DRAWER_WIDTH_MOBILE, PAGE_SIZE_MOBILE } from '../../utils/constants'
import { calculateNewDeck } from '../../utils/functions/deckFunctions'
import { CardDialog } from './Components/CardDialog'
import { CardsGrid } from './Components/CardsGrid'
import { Drawer } from './Components/Drawer'

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
    const { totalCount, goToPage, refetch: refetchCards } = useMTGCards()
    const { deck, setDeck } = useMTGDeckCreatorLogic()
    const { openDrawer, setOpenDrawer, setViewMode, viewMode, setOpenImportDialog, setOpenExportDialog } =
        useMTGDeckCreatorUI()
    const { propagateChangesToDashboardDeck } = useMTGDecks()
    const { filter, setFilter } = useMTGFilter()

    const { clearFilter } = useMTGFilter()
    const { getNodes } = useReactFlow()
    const {
        mutations: { updateMTGDeckMutation },
    } = MTGFunctions
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const [openTagManager, setOpenTagManager] = useState(false)
    const [pageSizeInput, setPageSizeInput] = useState(String(filter.pageSize))

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : filter.pageSize
    useEffect(() => {
        setPageSizeInput(String(filter.pageSize))
    }, [filter.pageSize])
    const applyPageSize = (value: string) => {
        if (value.trim() === '') {
            setPageSizeInput(String(filter.pageSize))
            return
        }
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) {
            setPageSizeInput(String(filter.pageSize))
            return
        }
        const normalized = Math.max(1, Math.floor(parsed))
        setPageSizeInput(String(normalized))
        setFilter((prev) => {
            if (prev.pageSize === normalized) {
                if (prev.page === 0) {
                    return prev
                }
                return { ...prev, page: 0 }
            }
            return { ...prev, pageSize: normalized, page: 0 }
        })
    }

    const handlePageSizeInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPageSizeInput(event.target.value)
    }

    const handleChangeView = (newViewMode: DeckCreatorView) => {
        if (viewMode === 'BOARD' || viewMode === 'CATALOGUE_BOARD') {
            calculateNewDeck(deck, getNodes, setDeck)
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
                phantoms: c.phantoms,
                position: c.position,
                selectedVersionID: c.selectedVersionID ?? undefined,
            })),
            deckID: deck.ID,
            name: deck.name,
            type: deck.type,
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
                        {!isMobile && (
                            <Box
                                display={'flex'}
                                justifyContent={'space-between'}
                                alignItems={'center'}
                                paddingX={2}
                                paddingY={1}
                                columnGap={2}
                                rowGap={1}
                                flexWrap={'wrap'}
                            >
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Cards per page"
                                    value={pageSizeInput}
                                    inputProps={{ min: 1 }}
                                    onChange={handlePageSizeInputChange}
                                    onBlur={() => {
                                        if (pageSizeInput.trim() !== '' && Number(pageSizeInput) !== filter.pageSize) {
                                            applyPageSize(pageSizeInput)
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            applyPageSize(pageSizeInput)
                                        }
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={filter.fillAvailableSpace}
                                            onChange={(event) => {
                                                const { checked } = event.target
                                                setFilter((prev) => ({
                                                    ...prev,
                                                    fillAvailableSpace: checked,
                                                }))
                                            }}
                                            color="primary"
                                        />
                                    }
                                    label="Fill available space"
                                />
                            </Box>
                        )}
                        <CardsGrid />
                        <Box mt={'auto'} display={'flex'} justifyContent={'center'} paddingTop={1}>
                            <TextField
                                size="small"
                                type="number"
                                label="Page"
                                value={filter.page + 1}
                                onChange={(event) => {
                                    void goToPage(Number(event.target.value) - 1)
                                }}
                                sx={{ width: 100 }}
                            />
                            <Pagination
                                count={Math.max(1, Math.ceil(totalCount / pageSize))}
                                page={filter.page + 1}
                                onChange={(_, page) => {
                                    void goToPage(page - 1)
                                }}
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    </>
                )}
                {(viewMode === 'BOARD' || viewMode === 'CATALOGUE_BOARD') && <FlowCanvas />}
                <Box position={'absolute'} top={10} right={10} display={'flex'} gap={1}>
                    <IconButton size="large" edge="start" color="inherit" aria-label="menu" onClick={handleMenuClick}>
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
                                    <IconButton onClick={() => handleChangeView('BOARD')}>
                                        <DashboardCustomize />
                                    </IconButton>
                                </Box>
                            </Grid>
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
                        <Divider />
                        <Typography variant="caption" display="block" gutterBottom>
                            Tag Operations
                        </Typography>
                        <MenuItem
                            onClick={() => {
                                setOpenTagManager(true)
                                handleMenuClose()
                            }}
                        >
                            Manage tags
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
            <CardDialog />
            <ManageTagsDialog
                open={openTagManager}
                onClose={() => setOpenTagManager(false)}
                onTagsChanged={() => void refetchCards()}
            />
        </Box>
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
        <MTGAFilterProvider>
            <MTGCardsProvider>
                <MTGDeckCreatorUIProvider>
                    <MTGDeckCreatorLogicProvider initialDeck={deck}>
                        <ReactFlowProvider>
                            <MTGDeckCreatorFlowProvider>
                                <DeckCreator />
                            </MTGDeckCreatorFlowProvider>
                        </ReactFlowProvider>
                    </MTGDeckCreatorLogicProvider>
                </MTGDeckCreatorUIProvider>
            </MTGCardsProvider>
        </MTGAFilterProvider>
    )
}
