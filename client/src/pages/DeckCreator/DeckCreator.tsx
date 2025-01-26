import { Box, Button, Collapse, Pagination } from '@mui/material'
import { ReactFlowProvider } from '@xyflow/react'
import { useParams } from 'react-router-dom'
import { ExportDialog } from '../../components/ExportDialog'
import { ImportDialog } from '../../components/ImportDialog'
import { DndProvider } from '../../context/DnD/DnDProvider'
import { MTGADeckCreatorProvider } from '../../context/MTGA/DeckCreator/MTGADeckCreatorProvider'
import { useMTGADeckCreator } from '../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { MTGADeckCreatorFlowProvider } from '../../context/MTGA/DeckCreatorFlow/MTGADeckCreatorFlowProvider'
import { MTGADeckCreatorPaginationProvider } from '../../context/MTGA/DeckCreatorPagination/MTGADeckCreatorPaginationProvider'
import { useMTGADeckCreatorPagination } from '../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { MTGAFilterProvider } from '../../context/MTGA/Filter/MTGAFilterProvider'
import { useMTGAFilter } from '../../context/MTGA/Filter/useMTGAFilter'
import { PAGE_SIZE } from '../../utils/constants'
import { useLocalStoreFilter } from '../../utils/hooks/useLocalStoreFilter'
import { FlowView } from '../FlowView/FlowView'
import { CardsGrid } from './Components/CardsGrid'
import { Drawer } from './Components/Drawer'
import { Filters } from './Components/Filters'

export const DeckCreator = () => {
    const { deck, openDrawer, setOpenDrawer, setViewMode, viewMode, setOpenImportDialog, setOpenExportDialog } =
        useMTGADeckCreator()
    const { filteredCards, page, setPage } = useMTGADeckCreatorPagination()
    const { loadLocalStoreFilter, saveLocalStoreFilter } = useLocalStoreFilter()
    const { clearFilter } = useMTGAFilter()

    if (!deck) return null

    return (
        <MTGADeckCreatorFlowProvider deck={deck}>
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
                        <Button variant={'contained'} color={'primary'} onClick={clearFilter} sx={{ mr: 2 }}>
                            Clear filter
                        </Button>
                        <Button variant={'contained'} color={'primary'} onClick={saveLocalStoreFilter}>
                            Save filter
                        </Button>
                        <Button variant={'contained'} color={'primary'} onClick={loadLocalStoreFilter} sx={{ mr: 2 }}>
                            Load filter
                        </Button>
                        <Button variant={'contained'} color={'primary'} onClick={() => setOpenImportDialog(true)}>
                            Import
                        </Button>
                        <Button
                            variant={'contained'}
                            color={'primary'}
                            onClick={() => setOpenExportDialog(true)}
                            sx={{ mr: 2 }}
                        >
                            Export
                        </Button>
                        <Button variant={'contained'} color={'primary'} onClick={() => setOpenDrawer(!openDrawer)}>
                            Open Drawer
                        </Button>
                        <Button
                            variant={'contained'}
                            color={'primary'}
                            onClick={() => setViewMode((prev) => (prev === 'catalogue' ? 'board' : 'catalogue'))}
                        >
                            Change View
                        </Button>
                        <Button variant={'contained'} color={'primary'} onClick={() => setViewMode('both')}>
                            Both View
                        </Button>
                    </Box>
                </Box>
                <Collapse in={openDrawer} orientation={'horizontal'}>
                    <Drawer />
                </Collapse>
                <ImportDialog />
                <ExportDialog />
            </Box>
        </MTGADeckCreatorFlowProvider>
    )
}

export const DeckCreatorWrapper = () => {
    const { deckID } = useParams()

    return (
        <ReactFlowProvider>
            <MTGADeckCreatorProvider deckID={deckID}>
                <DndProvider>
                    <MTGAFilterProvider>
                        <MTGADeckCreatorPaginationProvider>
                            <DeckCreator />
                        </MTGADeckCreatorPaginationProvider>
                    </MTGAFilterProvider>
                </DndProvider>
            </MTGADeckCreatorProvider>
        </ReactFlowProvider>
    )
}
