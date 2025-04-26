import { Button, Grid, Paper, Popper } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTG_Layout } from '../../graphql/types'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface LayoutSelectorProps {
    selected: Partial<Record<MTG_Layout, TernaryBoolean>>
    onNext: (layout: MTG_Layout) => void
    onPrev: (layout: MTG_Layout) => void
}

const LayoutSelector = (props: LayoutSelectorProps): JSX.Element => {
    const { selected, onNext, onPrev } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const { filter } = useMTGFilter()
    const { layouts } = filter

    const sortedLayouts = Object.entries(layouts).sort((a, b) => a[0].localeCompare(b[0])) as [
        MTG_Layout,
        TernaryBoolean,
    ][]

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Layouts</Button>
            <Popper open={open} anchorEl={anchorEl}>
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
            </Popper>
        </Grid>
    )
}

export default LayoutSelector
