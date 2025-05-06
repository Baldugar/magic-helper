import { Box, Grid, Typography, useMediaQuery } from '@mui/material'
import { isEqual } from 'lodash'
import { useEffect } from 'react'
import { useMTGDeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { filter, originalFilter } = useMTGFilter()

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

    const cardsToShow = filteredCards.slice(page * pageSize, (page + 1) * pageSize)

    useEffect(() => {
        const cardsGrid = document.getElementById('cards-grid')
        if (cardsGrid) {
            cardsGrid.scrollTop = 0
        }
    }, [page])

    return (
        <Grid
            id={'cards-grid'}
            container
            onWheel={(e) => {
                const hasVerticalScrollbar = e.currentTarget.scrollHeight > e.currentTarget.clientHeight
                if (hasVerticalScrollbar && !e.shiftKey) return
                if (e.deltaY > 0 && page < Math.floor(filteredCards.length / pageSize)) {
                    setPage(page + 1)
                }
                if (e.deltaY < 0 && page > 0) {
                    setPage(page - 1)
                }
            }}
            sx={{
                overflowY: 'auto',
                flex: 1,
                padding: 2,
            }}
            spacing={2}
        >
            {cardsToShow.length === 0 && isEqual(filter, originalFilter) && (
                <Box display={'flex'} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'}>
                    <Typography>Loading cards...</Typography>
                </Box>
            )}
            {cardsToShow.length === 0 && !isEqual(filter, originalFilter) && (
                <Box display={'flex'} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'}>
                    <Typography>No cards found with the current filters</Typography>
                </Box>
            )}
            {cardsToShow.map((card) => (
                <CardsGridButton card={card} key={card.ID} />
            ))}
        </Grid>
    )
}
