import { Box, Button, Grid, Paper, Popover, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RotatingHDeckBox from '../../../../components/dashboard/DeckBox/HDeckBox'
import { useMTGDecks } from '../../../../context/MTGA/Decks/useMTGDecks'

/**
 * DeckList shows the dashboard section for Decks.
 *
 * Includes
 * - Create button with popover form
 * - Responsive grid of interactive deck previews
 * - Navigation to the deck editor on click
 */
export const DeckList = () => {
    // Decks dashboard: creation UI, list, and navigation to editor
    const { decks, createDeck, deleteDeck } = useMTGDecks()

    const navigate = useNavigate()

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [name, setName] = useState('')

    /** Open the create deck popover. */
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    /** Close the popover and clear the deck name input. */
    const handleClose = () => {
        setAnchorEl(null)
        setName('')
    }

    const open = Boolean(anchorEl)

    return (
        <Stack padding={4} gap={2}>
            {/* Header bar with title and create action */}
            <Stack justifyContent={'flex-start'} direction={'row'} spacing={4}>
                <Typography variant={'h4'}>Decks</Typography>
                <Button variant={'contained'} color={'secondary'} onClick={handleClick}>
                    Create Deck
                </Button>
                {/* Create Deck popover form */}
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
                        {/* Name input for new deck */}
                        <TextField
                            fullWidth
                            variant={'filled'}
                            label={'Name'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Box display={'flex'} justifyContent={'flex-end'} marginTop={2}>
                            {/* Submit button: triggers create and closes popover */}
                            <Button
                                variant={'contained'}
                                color={'primary'}
                                disabled={name.length === 0}
                                onClick={() => {
                                    createDeck(name)
                                    handleClose()
                                }}
                            >
                                Create
                            </Button>
                        </Box>
                    </Paper>
                </Popover>
            </Stack>
            {/* Responsive grid of deck previews */}
            <Grid container columnSpacing={4}>
                {decks.map((deck) => (
                    <Grid item xs={12} md={6} lg={4} xl={3} key={deck.ID} container justifyContent={'center'}>
                        <RotatingHDeckBox
                            deck={deck}
                            // Navigate to deck editor on click
                            onClick={(d) => navigate(`/deck/${d.ID}`)}
                            // Confirm before deleting; remove from dashboard on confirm
                            onDelete={() => {
                                const confirmed = window.confirm('Are you sure you want to delete this deck?')
                                if (confirmed) {
                                    deleteDeck(deck.ID)
                                }
                            }}
                        />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    )
}
