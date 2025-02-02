import { Grid } from '@mui/material'
import { useMTGADeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { PAGE_SIZE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGADeckCreatorPagination()

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
            }}
        >
            {cardsToShow.map((card) => (
                <Grid item key={card.ID} xs={'auto'}>
                    <CardsGridButton card={card} />
                </Grid>
            ))}
        </Grid>
    )
}
