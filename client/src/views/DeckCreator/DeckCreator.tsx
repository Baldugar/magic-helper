import { Box, Collapse, Pagination } from '@mui/material'
import { ReactFlowProvider } from '@xyflow/react'
import { useParams } from 'react-router-dom'
import { DndProvider } from '../../context/DnD/DnDProvider'
import { MTGADeckCreatorProvider } from '../../context/MTGA/DeckCreator/MTGADeckCreatorProvider'
import { useMTGADeckCreator } from '../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { MTGADeckCreatorPaginationProvider } from '../../context/MTGA/DeckCreatorPagination/MTGADeckCreatorPaginationProvider'
import { useMTGADeckCreatorPagination } from '../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { MTGAFilterProvider } from '../../context/MTGA/Filter/MTGAFilterProvider'
import { PAGE_SIZE } from '../../utils/constants'
import { FlowView } from '../FlowView/FlowView'
import { CardsGrid } from './Components/CardsGrid'
import { Drawer } from './Components/Drawer'
import { Filters } from './Components/Filters'

export const DeckCreator = () => {
    const { deck, openDrawer, setOpenDrawer, setViewMode, viewMode } = useMTGADeckCreator()
    const { filteredCards, page, setPage } = useMTGADeckCreatorPagination()

    if (!deck) return null

    return (
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
                <Box position={'absolute'} top={10} right={10}>
                    <button onClick={() => setOpenDrawer(!openDrawer)}>Open Drawer</button>
                    <button onClick={() => setViewMode((prev) => (prev === 'catalogue' ? 'board' : 'catalogue'))}>
                        Change View
                    </button>
                    <button onClick={() => setViewMode('both')}>Both View</button>
                </Box>
            </Box>
            <Collapse in={openDrawer} orientation={'horizontal'}>
                <Drawer />
            </Collapse>
        </Box>
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
