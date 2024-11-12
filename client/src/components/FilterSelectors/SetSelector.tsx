import { Box, Button, Grid, Paper, Popper, Tooltip } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { useMTGAFilter } from '../../context/MTGA/Filter/useMTGAFilter'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import getEnvConfig from '../../utils/functions/getEnvConfig'
import { TernaryToggle } from './TernaryToggle'

export interface SetSelectorProps {
    selected: Record<string, TernaryBoolean>
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    iconSize?: number | string
}

const SetSelector = (props: SetSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }
    const envConfig = getEnvConfig()

    const open = Boolean(anchorEl)

    const { filter } = useMTGAFilter()
    const { sets } = filter
    const sortedSets = Object.entries(sets)
        .sort((a, b) => b[1].releasedAt - a[1].releasedAt)
        .map(([key, value]) => ({
            code: key,
            ...value,
        }))
        .reduce(
            (acc, curr) => {
                const year = new Date(curr.releasedAt).getFullYear().toString()
                if (!acc[year]) acc[year] = []
                acc[year].push(curr)
                return acc
            },
            {} as {
                [year: string]: {
                    setName: string
                    releasedAt: number
                    code: string
                    imageURL: string
                }[]
            },
        )

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Sets</Button>
            <Popper open={open} anchorEl={anchorEl}>
                <Paper sx={{ maxHeight: '80vh', overflow: 'auto' }}>
                    {Object.entries(sortedSets)
                        .reverse()
                        .map(([year, sets]) => (
                            <Grid container key={year}>
                                <Grid item>{year}</Grid>
                                {sets.map((set) => (
                                    <Grid item key={set.code}>
                                        <Tooltip title={set.setName}>
                                            <Box>
                                                <TernaryToggle
                                                    value={selected[set.code]}
                                                    type={'icon'}
                                                    iconButtonProps={{
                                                        size: 'small',
                                                        onClick: () => onNext(set.code),
                                                        onContextMenu: (e) => {
                                                            e.preventDefault()
                                                            onPrev(set.code)
                                                        },
                                                    }}
                                                    imgProps={{
                                                        width: iconSize ?? 40,
                                                        height: iconSize ?? 40,
                                                        style: {
                                                            opacity: selected[set.code] ? 1 : 0.3,
                                                            transition: 'opacity 250ms',
                                                        },
                                                    }}
                                                    URL={`http://${envConfig.domain}:${envConfig.port}/set/${set.code}`}
                                                />
                                            </Box>
                                        </Tooltip>
                                    </Grid>
                                ))}
                            </Grid>
                        ))}
                </Paper>
            </Popper>
        </Grid>
    )
}

export default SetSelector
