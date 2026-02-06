import { Badge, Button, ClickAwayListener, Grid, Paper, Popper } from '@mui/material'
import { MouseEvent, useRef, useState } from 'react'
import { useMTGFilter } from '../../../../context/MTGA/Filter/useMTGFilter'
import { MTG_Game, TernaryBoolean } from '../../../../graphql/types'
import { isNegativeTB, isPositiveTB } from '../../../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface GameSelectorProps {
    selected: Partial<Record<MTG_Game, TernaryBoolean>>
    onNext: (game: MTG_Game) => void
    onPrev: (game: MTG_Game) => void
}

const GameSelector = (props: GameSelectorProps): JSX.Element => {
    const { selected, onNext, onPrev } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const handleClickAway = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
        if (buttonRef.current?.contains(event.target as Node)) return
        setAnchorEl(null)
    }

    const open = Boolean(anchorEl)

    const { filter } = useMTGFilter()
    const { games } = filter

    const sortedGames = Object.entries(games).sort((a, b) => a[0].localeCompare(b[0])) as [MTG_Game, TernaryBoolean][]

    const howManyPositive = Object.values(selected).filter(isPositiveTB).length
    const howManyNegative = Object.values(selected).filter(isNegativeTB).length

    return (
        <Grid container item xs={'auto'}>
            <Badge
                badgeContent={howManyPositive}
                color="success"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Badge
                    badgeContent={howManyNegative}
                    color="error"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Button ref={buttonRef} onClick={handleClick}>Games</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl}>
                <ClickAwayListener onClickAway={handleClickAway}>
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
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default GameSelector
