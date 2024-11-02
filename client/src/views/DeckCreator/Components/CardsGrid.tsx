import { ButtonBase, Grid } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { MTGACardWithHover } from '../../../components/MTGACardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { useMTGADeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { MTGA_Card } from '../../../graphql/types'
import { PAGE_SIZE } from '../../../utils/constants'
import { organizeNodes } from '../../../utils/functions/nodeFunctions'

export const CardsGrid = () => {
    const { onAddCard } = useMTGADeckCreator()
    const { setNodes } = useReactFlow()
    const { filteredCards, page, setPage } = useMTGADeckCreatorPagination()
    const { card: draggedCard } = useDnD()

    const handleAddCard = (card: MTGA_Card) => {
        const newDeck = onAddCard(card)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck))
    }

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
            {filteredCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((card) => (
                <Grid item key={card.ID} xs={'auto'}>
                    <ButtonBase onClick={() => handleAddCard(card)}>
                        <MTGACardWithHover card={card} hideHover={draggedCard !== null} />
                    </ButtonBase>
                </Grid>
            ))}
        </Grid>
    )
}
