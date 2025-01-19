import {
    Box,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DeckBox from '../../components/DeckBox'
import { MTGADecksContext } from '../../context/MTGA/Decks/MTGADecksContext'
import { MTGAFunctions } from '../../graphql/MTGA/functions'
import { DeckType } from '../../graphql/types'

export const DeckList = () => {
    const { decks, setDecks } = useContext(MTGADecksContext)

    const navigate = useNavigate()

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<DeckType>()

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setName('')
        setType(undefined)
    }

    const open = Boolean(anchorEl)
    const {
        mutations: { createMTGADeck, deleteMTGADeck },
    } = MTGAFunctions

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
                        <FormControl variant="filled" fullWidth sx={{ marginTop: 2 }}>
                            <InputLabel>Type</InputLabel>
                            <Select<DeckType | undefined>
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value as DeckType | undefined)
                                }}
                            >
                                <MenuItem>
                                    <em>None</em>
                                </MenuItem>
                                {Object.values(DeckType).map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box display={'flex'} justifyContent={'flex-end'} marginTop={2}>
                            <Button
                                variant={'contained'}
                                color={'primary'}
                                disabled={name.length === 0 || !type}
                                onClick={() =>
                                    createMTGADeck({
                                        name,
                                        type: type!,
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
            <Grid container gap={4}>
                {decks.map((deck) => (
                    <Grid item key={deck.ID}>
                        <DeckBox
                            image={deck.cardFrontImage}
                            name={deck.name}
                            onClick={() => navigate(`/deck/${deck.ID}`)}
                            onDelete={() =>
                                deleteMTGADeck(deck.ID).then(() => setDecks(decks.filter((d) => d.ID !== deck.ID)))
                            }
                        />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    )
}
