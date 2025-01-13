import { ButtonBase, Grid } from '@mui/material'
import { MTGACardWithHover } from '../../../components/MTGACardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { useMTGADeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGADeckFlowCreator'
import { useMTGADeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { MTGA_Card } from '../../../graphql/types'
import { PAGE_SIZE } from '../../../utils/constants'
import { organizeNodes } from '../../../utils/functions/nodeFunctions'

export const CardsGrid = () => {
    const { onAddCard, deck } = useMTGADeckCreator()
    const { setNodes, handleDeleteZone, handleRenameZone } = useMTGADeckFlowCreator()
    const { filteredCards, page, setPage } = useMTGADeckCreatorPagination()
    const { card: draggedCard } = useDnD()

    const handleAddCard = (card: MTGA_Card) => {
        const newDeck = onAddCard(card)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone))
    }

    const deckCardIDs = deck?.cards.map((c) => c.card.ID) || []

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
                    <ButtonBase
                        onClick={() => handleAddCard(card)}
                        sx={{
                            filter: deckCardIDs.includes(card.ID) ? 'brightness(0.5)' : 'brightness(1)',
                            transition: 'filter 0.3s',
                        }}
                    >
                        <MTGACardWithHover card={card} hideHover={draggedCard !== null} debugValue={'releasedAt'} />
                    </ButtonBase>
                </Grid>
            ))}
        </Grid>
    )
}
