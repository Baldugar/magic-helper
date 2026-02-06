import { Badge, Button, ClickAwayListener, Grid, Paper, Popper } from '@mui/material'
import { MouseEvent, useRef, useState } from 'react'
import { useMTGFilter } from '../../../../context/MTGA/Filter/useMTGFilter'
import { MTG_Layout, TernaryBoolean } from '../../../../graphql/types'
import { isNegativeTB, isPositiveTB } from '../../../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface LayoutSelectorProps {
    selected: Partial<Record<MTG_Layout, TernaryBoolean>>
    onNext: (layout: MTG_Layout) => void
    onPrev: (layout: MTG_Layout) => void
}

const LayoutSelector = (props: LayoutSelectorProps): JSX.Element => {
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
    const { layouts } = filter

    const sortedLayouts = Object.entries(layouts).sort((a, b) => a[0].localeCompare(b[0])) as [
        MTG_Layout,
        TernaryBoolean,
    ][]

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
                    <Button ref={buttonRef} onClick={handleClick}>Layouts</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl}>
                <ClickAwayListener onClickAway={handleClickAway}>
                    <Paper sx={{ maxHeight: '80vh', overflow: 'auto' }}>
                        {sortedLayouts.map(([layout]) => (
                            <Grid item container key={layout} xs={12}>
                                <TernaryToggle
                                    value={selected[layout] ?? TernaryBoolean.UNSET}
                                    type="textButton"
                                    textButtonProps={{
                                        onClick: () => onNext(layout),
                                        onContextMenu: (e) => {
                                            e.preventDefault()
                                            onPrev(layout)
                                        },
                                        children: layout,
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

export default LayoutSelector
