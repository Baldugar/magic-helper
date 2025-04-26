import { Box, Button, Grid, Paper, Popper, Typography } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface LegalitySelectorProps {
    selected: Record<string, Record<string, TernaryBoolean>>
    onSelect: (format: string, legalityValue: string, value: TernaryBoolean) => void
}

//https://v0.dev/chat/material-ui-toggle-ujyrGklJjn6

const LegalitySelector = (props: LegalitySelectorProps): JSX.Element => {
    const { selected, onSelect } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const { filter } = useMTGFilter()
    const { legalities } = filter

    const sortedLegalities = Object.entries(legalities).sort((a, b) => a[0].localeCompare(b[0]))

    const legalitySortValues = ['legal', 'restricted', 'banned', 'not_legal']

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Legalities</Button>
            <Popper open={open} anchorEl={anchorEl}>
                <Paper sx={{ maxHeight: '80vh', overflow: 'auto' }}>
                    {sortedLegalities.map(([format, legalityValues]) => (
                        <Grid item container key={format} xs={12}>
                            <Grid item xs={12}>
                                <Typography
                                    variant={'h6'}
                                    sx={{
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {format}
                                </Typography>
                            </Grid>
                            {Object.entries(legalityValues)
                                .map(([legalityValue, _]) => legalityValue)
                                .sort((a, b) => legalitySortValues.indexOf(a) - legalitySortValues.indexOf(b))
                                .map((legalityValue) => (
                                    <Grid item key={legalityValue} xs={3}>
                                        <Box display={'flex'} flexDirection={'column'} alignItems={'center'}>
                                            <Typography>{legalityValue}</Typography>
                                            <TernaryToggle
                                                value={selected[format][legalityValue]}
                                                type={'toggleButton'}
                                                toggleButtonGroupProps={{
                                                    exclusive: true,
                                                    onChange: (_, value) => {
                                                        onSelect(format, legalityValue, value ?? TernaryBoolean.UNSET)
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                ))}
                        </Grid>
                    ))}
                </Paper>
            </Popper>
        </Grid>
    )
}

export default LegalitySelector
