import { Clear } from '@mui/icons-material'
import { Box, Button, ClickAwayListener, Grid, IconButton, Paper, Popper, Rating, Typography } from '@mui/material'
import { MouseEvent, useState } from 'react'

export interface RatingSelectorProps {
    selected: {
        min: number
        max: number
    }
    onSetMin: (min: number) => void
    onSetMax: (max: number) => void
}

const RatingSelector = (props: RatingSelectorProps): JSX.Element => {
    const { onSetMin, onSetMax, selected } = props

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Rating</Button>
            <Popper open={open} anchorEl={anchorEl} container={document.body}>
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper sx={{ padding: 2 }}>
                        <Typography component="legend">Min</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1 }}>
                            <Rating
                                value={selected.min}
                                max={10}
                                onChange={(_, value) => {
                                    if (value) {
                                        onSetMin(value)
                                    }
                                }}
                            />
                            {selected.min > 0 && <Typography>{selected.min}</Typography>}
                            {selected.min > 0 && (
                                <IconButton onClick={() => onSetMin(0)} size="small">
                                    <Clear />
                                </IconButton>
                            )}
                        </Box>
                        <Typography component="legend">Max</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1 }}>
                            <Rating
                                value={selected.max}
                                max={10}
                                onChange={(_, value) => {
                                    if (value) {
                                        onSetMax(value)
                                    }
                                }}
                            />
                            {selected.max > 0 && <Typography>{selected.max}</Typography>}
                            {selected.max > 0 && (
                                <IconButton onClick={() => onSetMax(0)} size="small">
                                    <Clear />
                                </IconButton>
                            )}
                        </Box>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default RatingSelector
