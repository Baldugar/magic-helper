import CloseIcon from '@mui/icons-material/Close'
import { Box, Dialog, DialogContent, DialogTitle, Grid, IconButton, Rating, Typography } from '@mui/material'
import { useMemo } from 'react'
import { FlipCard } from '../../../components/FlipCard'
import { useMTGCards } from '../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'

export const CardDialog = () => {
    const { openedCardDialog, setOpenedCardDialog } = useMTGDeckCreator()
    const { cards, setRatingForCard } = useMTGCards()
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
                            <Grid item xs={12} lg={6}>
                                {card.myRating && <Typography>My rating: {card.myRating.value}</Typography>}
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Rating
                                        value={card.myRating?.value || 0}
                                        max={10}
                                        onChange={(_, value) => {
                                            if (value) {
                                                setRatingForCard(card.ID, value)
                                            }
                                        }}
                                    />
                                    {!!card.myRating?.value && card.myRating.value > 0 && (
                                        <IconButton sx={{ marginLeft: 1 }} onClick={() => setRatingForCard(card.ID, 0)}>
                                            <CloseIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </DialogContent>
                </>
            )}
        </Dialog>
    )
}
