import { Dialog, DialogContent, DialogTitle, Grid } from '@mui/material'
import { useMemo } from 'react'
import { FlipCard } from '../../../components/deckBuilder/CardTile/FlipCard'
import { useMTGCards } from '../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreatorUI } from '../../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'

export const CardDialog = () => {
    const { openedCardDialog, setOpenedCardDialog } = useMTGDeckCreatorUI()
    const { cards } = useMTGCards()
    const card = useMemo(() => cards.find((c) => c.ID === openedCardDialog), [cards, openedCardDialog])

    return (
        <Dialog open={!!card} onClose={() => setOpenedCardDialog(null)} fullWidth maxWidth={'xl'}>
            {card && (
                <>
                    <DialogTitle>{card.name}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12} lg={6} display={'flex'} justifyContent={'center'}>
                                <FlipCard card={card} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                </>
            )}
        </Dialog>
    )
}
