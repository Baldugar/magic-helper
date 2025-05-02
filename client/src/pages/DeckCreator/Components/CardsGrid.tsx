import { Box, Grid, Typography } from '@mui/material'
import { isEqual } from 'lodash'
import { useMTGDeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { PAGE_SIZE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { filter, originalFilter } = useMTGFilter()

    const cardsToShow = filteredCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    return (
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
