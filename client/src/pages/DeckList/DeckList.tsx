import { Box, Button, Grid, Paper, Popover, Stack, TextField, Typography } from '@mui/material'
import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RotatingHDeckBox from '../../components/HDeckBox'
import { MTGDecksContext } from '../../context/MTGA/Decks/MTGDecksContext'
import { MTGFunctions } from '../../graphql/MTGA/functions'

export const DeckList = () => {
    const { decks, setDecks } = useContext(MTGDecksContext)

    const navigate = useNavigate()

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [name, setName] = useState('')

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setName('')
    }

    const open = Boolean(anchorEl)
    const {
        mutations: { createMTGDeck, deleteMTGDeck },
    } = MTGFunctions

    return (
        <Stack padding={4} gap={2}>
            <Stack justifyContent={'flex-start'} direction={'row'} spacing={4}>
                <Typography variant={'h4'}>Decks</Typography>
                <Button variant={'contained'} color={'secondary'} onClick={handleClick}>
                    Create Deck
                </Button>
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <Paper sx={{ padding: 2 }}>
                        <TextField
                            fullWidth
                            variant={'filled'}
                            label={'Name'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Box display={'flex'} justifyContent={'flex-end'} marginTop={2}>
                            <Button
                                variant={'contained'}
                                color={'primary'}
                                disabled={name.length === 0}
                                onClick={() =>
                                    createMTGDeck({
                                        name,
                                    }).then((deck) => {
                                        setDecks([...decks, deck])
                                        handleClose()
                                    })
                                }
                            >
                                Create
                            </Button>
                        </Box>
                    </Paper>
                </Popover>
            </Stack>
            <Grid container columnSpacing={4}>
                {decks.map((deck) => (
                    <Grid item xs={12} md={6} lg={4} xl={3} key={deck.ID} container justifyContent={'center'}>
                        {/* <RotatingDeckBox /> */}
                        <RotatingHDeckBox
                            deck={deck}
                            onClick={(d) => navigate(`/deck/${d.ID}`)}
                            onDelete={() => {
                                const confirmed = window.confirm('Are you sure you want to delete this deck?')
                                if (confirmed) {
                                    deleteMTGDeck(deck.ID).then(() => setDecks(decks.filter((d) => d.ID !== deck.ID)))
                                }
                            }}
                        />
                        {/* 
                            // image={deck.cardFrontImage}
                            // name={deck.name}
                            // onClick={() => navigate(`/deck/${deck.ID}`)}
                            // onDelete={() =>
                            //     deleteMTGADeck(deck.ID).then(() => setDecks(decks.filter((d) => d.ID !== deck.ID)))
                            // }
                        /> */}
                    </Grid>
                ))}
            </Grid>
        </Stack>
    )
}
