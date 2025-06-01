import { ExpandMore } from '@mui/icons-material'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Badge,
    Box,
    Button,
    ClickAwayListener,
    Grid,
    Paper,
    Popper,
    TextField,
    Typography,
} from '@mui/material'
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
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
    games: MTG_Game[]
}

const GAME_EMOJIS: Record<MTG_Game, string> = {
    paper: '🎴',
    mtgo: '💻',
    arena: '🎮',
}

const SetSelector = (props: SetSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, setValue, iconSize } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [search, setSearch] = useState('')
    const [accordionOpenState, setAccordionOpenState] = useState<Record<string, boolean>>({})
    const [scrollPosition, setScrollPosition] = useState(0)
    const paperRef = useRef<HTMLDivElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    useEffect(() => {
        if (open && scrollPosition > 0) {
            setTimeout(() => {
                if (paperRef.current) {
                    paperRef.current.scrollTop = scrollPosition
                }
            }, 0)
        }
    }, [open, scrollPosition])

    const { filter } = useMTGFilter()
    const { sets, games } = filter

    const positiveGames = useMemo(
        () =>
            Object.entries(games)
                .filter(([_, v]) => isPositiveTB(v))
                .map(([k]) => k as MTG_Game),
        [games],
    )
    const negativeGames = useMemo(
        () =>
            Object.entries(games)
                .filter(([_, v]) => isNegativeTB(v))
                .map(([k]) => k as MTG_Game),
        [games],
    )
    const gameFilterIsNotSet = useMemo(() => Object.values(games).every((v) => v === TernaryBoolean.UNSET), [games])

    const grouped = useMemo(() => {
        return Object.entries(sets)
            .map(([code, s]) => ({ code, ...s }))
            .filter((s) => s.setName.toLowerCase().includes(search.toLowerCase()))
            .reduce<Record<string, Record<string, FilterSet[]>>>((acc, curr) => {
                if (!gameFilterIsNotSet) {
                    let allowed = true
                    if (positiveGames.length) allowed = positiveGames.some((g) => curr.games.includes(g))
                    if (negativeGames.length) allowed &&= !negativeGames.some((g) => curr.games.includes(g))
                    if (!allowed) return acc
                }

                const year = new Date(curr.releasedAt).getFullYear().toString()
                const typeLabel = TYPE_TO_GROUP[curr.setType] ?? curr.setType // fallback

                acc[year] ??= {}
                ;(acc[year][typeLabel] ??= []).push(curr as FilterSet)
                return acc
            }, {})
    }, [sets, gameFilterIsNotSet, positiveGames, negativeGames, search])

    const howManyPositive = Object.values(selected).filter(isPositiveTB).length
    const howManyNegative = Object.values(selected).filter(isNegativeTB).length

    const yearsSorted = useMemo(() => Object.keys(grouped).sort((a, b) => Number(b) - Number(a)), [grouped])

    const handleToggleAccordion = (yearKey: string) => {
        setAccordionOpenState((prev) => {
            const isCurrentlyExplicitlySet = yearKey in prev
            let currentActualState: boolean

            if (isCurrentlyExplicitlySet) {
                currentActualState = prev[yearKey]!
            } else {
                // Default for the first year is open, others are closed
                currentActualState = yearsSorted.length > 0 && yearKey === yearsSorted[0]
            }
            return { ...prev, [yearKey]: !currentActualState }
        })
    }

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
                <ClickAwayListener
                    onClickAway={
                        open
                            ? () => {
                                  if (paperRef.current) {
                                      setScrollPosition(paperRef.current.scrollTop)
                                  }
                                  setAnchorEl(null)
                              }
                            : () => {}
                    }
                >
                    <Paper ref={paperRef} sx={{ maxHeight: '70vh', maxWidth: '50vw', overflow: 'auto' }}>
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
                        <Typography variant="body2" sx={{ pl: 1, pt: 1 }}>
                            Legend: 🎴 Paper, 💻 MTGO, 🎮 Arena
                        </Typography>
                        {yearsSorted.map((year) => {
                            const isAccordionOpen =
                                accordionOpenState[year] ?? (yearsSorted.length > 0 && year === yearsSorted[0])
                            return (
                                <YearItem
                                    key={year}
                                    grouped={grouped}
                                    iconSize={iconSize}
                                    onNext={onNext}
                                    onPrev={onPrev}
                                    selected={selected}
                                    setValue={setValue}
                                    year={year}
                                    isAccordionOpen={isAccordionOpen}
                                    onToggleAccordion={() => handleToggleAccordion(year)}
                                />
                            )
                        })}
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default SetSelector

const SET_TYPE_GROUPS_ORDERED: { label: string; types: string[] }[] = [
    {
        label: 'Core & Expansions',
        types: ['core', 'expansion'],
    },
    {
        label: 'Commander & Decks',
        types: ['commander', 'duel_deck', 'planechase', 'archenemy', 'starter'],
    },
    {
        label: 'Digital only',
        types: ['alchemy', 'treasure_chest'],
    },
    {
        label: 'Masters / Reprints',
        types: ['masters', 'draft_innovation'],
    },
    {
        label: 'Premium Collections',
        types: ['masterpiece', 'from_the_vault', 'premium_deck', 'arsenal', 'spellbook', 'box'],
    },
]

const TYPE_TO_GROUP: Record<string, string> = Object.fromEntries(
    SET_TYPE_GROUPS_ORDERED.flatMap(({ label, types }) => types.map((t) => [t, label] as const)),
)

const categoryOrderIndex = (label: string) => {
    const idx = SET_TYPE_GROUPS_ORDERED.findIndex((g) => g.label === label)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

const aggregateTernaryBoolean = (values: TernaryBoolean[]): TernaryBoolean => {
    const hasOn = values.includes(TernaryBoolean.TRUE)
    const hasOff = values.includes(TernaryBoolean.FALSE)
    if (hasOn && hasOff) return TernaryBoolean.UNSET
    if (hasOn) return TernaryBoolean.TRUE
    if (hasOff) return TernaryBoolean.FALSE
    return TernaryBoolean.UNSET
}

interface YearItemProps {
    year: string
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    setValue: (filterOption: string, value: TernaryBoolean) => void
    grouped: Record<string, Record<string, FilterSet[]>>
    selected: Record<string, TernaryBoolean>
    iconSize: number | string | undefined
    isAccordionOpen: boolean
    onToggleAccordion: () => void
}

const YearItem: React.FC<YearItemProps> = ({
    year,
    onNext,
    onPrev,
    setValue,
    grouped,
    selected,
    iconSize,
    isAccordionOpen,
    onToggleAccordion,
}) => {
    const categories = grouped[year]
    const allStates: TernaryBoolean[] = []
    Object.values(categories).forEach((arr) =>
        arr.forEach((s) => allStates.push(selected[s.code] ?? TernaryBoolean.UNSET)),
    )
    const yearState = aggregateTernaryBoolean(allStates)
    return (
        <Accordion key={year} expanded={isAccordionOpen} onChange={onToggleAccordion} disableGutters>
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
                {Object.entries(categories)
                    .sort(([a], [b]) => categoryOrderIndex(a) - categoryOrderIndex(b) || a.localeCompare(b))
                    .map(([type, setsInType]) => {
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
                                    {setsInType
                                        .sort((a, b) => b.releasedAt - a.releasedAt)
                                        .map((set) => (
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
                            {set.setName} ({new Date(set.releasedAt).toLocaleDateString()}){' '}
                            {set.games
                                .sort(
                                    (a, b) =>
                                        ['paper', 'mtgo', 'arena'].indexOf(a) - ['paper', 'mtgo', 'arena'].indexOf(b),
                                )
                                .map((game) => GAME_EMOJIS[game])
                                .join(' ')}
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
