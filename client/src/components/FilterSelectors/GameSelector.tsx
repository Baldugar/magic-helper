import { Button, Grid, Paper, Popper } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTG_Game } from '../../graphql/types'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface GameSelectorProps {
    selected: Partial<Record<MTG_Game, TernaryBoolean>>
    onNext: (game: MTG_Game) => void
    onPrev: (game: MTG_Game) => void
}

const GameSelector = (props: GameSelectorProps): JSX.Element => {
    const { selected, onNext, onPrev } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const { filter } = useMTGFilter()
    const { games } = filter

    const sortedGames = Object.entries(games).sort((a, b) => a[0].localeCompare(b[0])) as [MTG_Game, TernaryBoolean][]

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Games</Button>
            <Popper open={open} anchorEl={anchorEl}>
                <Paper sx={{ maxHeight: '80vh', overflow: 'auto' }}>
                    {sortedGames.map(([game]) => (
                        <Grid item container key={game} xs={12}>
                            <TernaryToggle
                                value={selected[game] ?? TernaryBoolean.UNSET}
                                type="textButton"
                                textButtonProps={{
                                    onClick: () => onNext(game),
                                    onContextMenu: (e) => {
                                        e.preventDefault()
                                        onPrev(game)
                                    },
                                    children: game,
                                }}
                            />
                        </Grid>
                    ))}
                </Paper>
            </Popper>
        </Grid>
    )
}

export default GameSelector
