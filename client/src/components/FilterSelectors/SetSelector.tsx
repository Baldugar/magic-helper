import { ExpandMore } from '@mui/icons-material'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Badge,
    Box,
    Button,
    Grid,
    Paper,
    Popper,
    TextField,
    Typography,
} from '@mui/material'
import { MouseEvent, useMemo, useState } from 'react'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTG_Game } from '../../graphql/types'
import { isNegativeTB, isPositiveTB, nextTB, prevTB, TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface SetSelectorProps {
    selected: Record<string, TernaryBoolean>
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    setValue: (filterOption: string, value: TernaryBoolean) => void
    iconSize?: number | string
}

type FilterSet = {
    setName: string
    releasedAt: number // epoch ms
    code: string
    imageURL: string
    setType: string
}

const SetSelector = (props: SetSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, setValue, iconSize } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [search, setSearch] = useState('')

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const { filter } = useMTGFilter()
    const { sets, games } = filter

    const positiveGames = Object.entries(games)
        .filter(([_, value]) => isPositiveTB(value))
        .map(([key]) => key as MTG_Game)
    const negativeGames = Object.entries(games)
        .filter(([_, value]) => isNegativeTB(value))
        .map(([key]) => key as MTG_Game)
    const gameFilterIsNotSet = Object.values(games).every((value) => value === TernaryBoolean.UNSET)

    const grouped = useMemo(() => {
        return Object.entries(sets)
            .map(([code, s]) => ({ code, ...s }))
            .filter((s) => s.setName.toLowerCase().includes(search.toLowerCase()))
            .reduce<Record<string, Record<string, FilterSet[]>>>((acc, curr) => {
                if (gameFilterIsNotSet) {
                    const year = new Date(curr.releasedAt).getFullYear().toString()
                    const type = curr.setType
                    acc[year] ??= {}
                    ;(acc[year][type] ??= []).push(curr)
                } else {
                    let shouldAdd = false
                    if (positiveGames.length > 0) {
                        shouldAdd = positiveGames.some((game) => curr.games.includes(game))
                    }
                    if (negativeGames.length > 0) {
                        shouldAdd = !negativeGames.some((game) => curr.games.includes(game))
                    }
                    if (shouldAdd) {
                        const year = new Date(curr.releasedAt).getFullYear().toString()
                        const type = curr.setType
                        acc[year] ??= {}
                        ;(acc[year][type] ??= []).push(curr)
                    }
                }
                return acc
            }, {})
    }, [sets, gameFilterIsNotSet, positiveGames, negativeGames, search])

    const howManyPositive = Object.values(selected).filter(isPositiveTB).length
    const howManyNegative = Object.values(selected).filter(isNegativeTB).length

    const yearsSorted = useMemo(() => Object.keys(grouped).sort((a, b) => Number(b) - Number(a)), [grouped])

    return (
        <Grid container item xs={'auto'} direction="column">
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
                    <Button onClick={handleClick}>Sets</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl}>
                <Paper sx={{ maxHeight: '70vh', maxWidth: '50vw', overflow: 'auto' }}>
                    <TextField
                        label="Search"
                        variant={'filled'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        fullWidth
                        sx={{ pl: 1, pt: 1 }}
                    />
                    <Typography variant="body2" sx={{ pl: 1, pt: 1 }}>
                        The game filter is applied to the sets.
                    </Typography>
                    {yearsSorted.map((year) => (
                        <YearItem
                            key={year}
                            grouped={grouped}
                            iconSize={iconSize}
                            onNext={onNext}
                            onPrev={onPrev}
                            selected={selected}
                            setValue={setValue}
                            year={year}
                            yearsSorted={yearsSorted}
                        />
                    ))}
                </Paper>
            </Popper>
        </Grid>
    )
}

export default SetSelector

const aggregateTernaryBoolean = (values: TernaryBoolean[]): TernaryBoolean => {
    const hasOn = values.includes(TernaryBoolean.TRUE)
    const hasOff = values.includes(TernaryBoolean.FALSE)
    if (hasOn && hasOff) return TernaryBoolean.UNSET
    if (hasOn) return TernaryBoolean.TRUE
    if (hasOff) return TernaryBoolean.FALSE
    return TernaryBoolean.UNSET
}

const YearItem: React.FC<{
    year: string
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    setValue: (filterOption: string, value: TernaryBoolean) => void
    grouped: Record<string, Record<string, FilterSet[]>>
    selected: Record<string, TernaryBoolean>
    yearsSorted: string[]
    iconSize: number | string | undefined
}> = ({ year, onNext, onPrev, setValue, grouped, selected, yearsSorted, iconSize }) => {
    const categories = grouped[year]
    const allStates: TernaryBoolean[] = []
    Object.values(categories).forEach((arr) =>
        arr.forEach((s) => allStates.push(selected[s.code] ?? TernaryBoolean.UNSET)),
    )
    const yearState = aggregateTernaryBoolean(allStates)
    const [open, setOpen] = useState(year === yearsSorted[0])
    return (
        <Accordion
            key={year}
            defaultExpanded={open}
            expanded={open}
            onChange={(_, expanded) => setOpen(expanded)}
            disableGutters
        >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ backgroundColor: 'secondary.main' }}>
                <Grid container alignItems="center" spacing={1} wrap="nowrap">
                    <Grid item>
                        <TernaryToggle
                            type={'checkbox'}
                            value={yearState}
                            labelProps={{
                                slotProps: {
                                    typography: {
                                        variant: 'h6',
                                        fontWeight: 'bold',
                                        sx: {
                                            textTransform: 'capitalize',
                                        },
                                    },
                                },
                                label: year,
                            }}
                            checkboxProps={{
                                onClick: () => {
                                    const nextValue = nextTB(yearState)
                                    Object.values(categories).forEach((arr) =>
                                        arr.forEach((set) => setValue(set.code, nextValue)),
                                    )
                                },
                                onContextMenu: () => {
                                    const prevValue = prevTB(yearState)
                                    Object.values(categories).forEach((arr) =>
                                        arr.forEach((set) => setValue(set.code, prevValue)),
                                    )
                                },
                            }}
                        />
                    </Grid>
                </Grid>
            </AccordionSummary>
            <AccordionDetails>
                {Object.entries(categories).map(([type, setsInType]) => {
                    const catState = aggregateTernaryBoolean(
                        setsInType.map((s) => selected[s.code] ?? TernaryBoolean.UNSET),
                    )

                    return (
                        <Box key={type} sx={{ mb: 1 }}>
                            <Grid container alignItems="center" spacing={1} wrap="nowrap">
                                <Grid item>
                                    <TernaryToggle
                                        type={'checkbox'}
                                        value={catState}
                                        labelProps={{
                                            slotProps: {
                                                typography: {
                                                    variant: 'h6',
                                                    fontWeight: 'bold',
                                                    sx: {
                                                        textTransform: 'capitalize',
                                                    },
                                                },
                                            },
                                            label: type,
                                        }}
                                        checkboxProps={{
                                            onClick: () => {
                                                const nextValue = nextTB(catState)
                                                setsInType.forEach((s) => setValue(s.code, nextValue))
                                            },
                                            onContextMenu: () => {
                                                const prevValue = prevTB(catState)
                                                setsInType.forEach((s) => setValue(s.code, prevValue))
                                            },
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            <Grid container spacing={0.5} sx={{ pl: 4, mt: 0.5 }} direction={'column'}>
                                {setsInType.map((set) => (
                                    <SetItem
                                        key={set.code}
                                        set={set}
                                        value={selected[set.code] ?? TernaryBoolean.UNSET}
                                        onNext={onNext}
                                        onPrev={onPrev}
                                        iconSize={iconSize ?? 40}
                                    />
                                ))}
                            </Grid>
                        </Box>
                    )
                })}
            </AccordionDetails>
        </Accordion>
    )
}

interface SetItemProps {
    set: FilterSet
    value: TernaryBoolean
    onNext: (setCode: string) => void
    onPrev: (setCode: string) => void
    iconSize: number | string
}
const SetItem: React.FC<SetItemProps> = ({ set, value, onNext, onPrev, iconSize }) => (
    <Grid item xs={12} sm={6} md={4} lg={3} display="flex" alignItems="center">
        <TernaryToggle
            value={value}
            type={'checkbox'}
            labelProps={{
                slotProps: {
                    typography: {
                        variant: 'body2',
                    },
                },
                label: (
                    <Box display="flex" alignItems="center">
                        <Box
                            component="img"
                            src={set.imageURL}
                            alt="set logo"
                            sx={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
                            loading="lazy"
                        />
                        <Typography variant="body2" noWrap sx={{ marginLeft: 1 }}>
                            {set.setName}
                        </Typography>
                    </Box>
                ),
                sx: {
                    mr: 0,
                },
            }}
            checkboxProps={{
                onClick: () => onNext(set.code),
                onContextMenu: () => onPrev(set.code),
            }}
        />
    </Grid>
)
