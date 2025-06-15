import { Clear, FindReplace, Search } from '@mui/icons-material'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Popover,
    Switch,
    TextField,
    useMediaQuery,
} from '@mui/material'
import { MouseEvent, useState } from 'react'
import { CMCSelector } from '../../../components/FilterSelectors/CMCSelector'
import GameSelector from '../../../components/FilterSelectors/GameSelector'
import LayoutSelector from '../../../components/FilterSelectors/LayoutSelector'
import LegalitySelector from '../../../components/FilterSelectors/LegalitySelector'
import ManaSelector from '../../../components/FilterSelectors/ManaSelector'
import RaritySelector from '../../../components/FilterSelectors/RaritySelector'
import RatingSelector from '../../../components/FilterSelectors/RatingSelector'
import SetSelector from '../../../components/FilterSelectors/SetSelector'
import { SortSelector } from '../../../components/FilterSelectors/SortSelector'
import { TagSelector } from '../../../components/FilterSelectors/TagSelector'
import TypeSelector from '../../../components/FilterSelectors/TypeSelector'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { initialMTGFilter } from '../../../context/MTGA/Filter/MTGFilterContext'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { nextTB, prevTB, TernaryBoolean } from '../../../types/ternaryBoolean'

export const Filters = () => {
    const { filter, setFilter } = useMTGFilter()
    const { stickyCardsGrid, setStickyCardsGrid } = useMTGDeckCreator()
    const isMobile = useMediaQuery('(max-width: 600px)')
    const [searchAnchorEl, setSearchAnchorEl] = useState<null | HTMLElement>(null)
    const [search, setSearch] = useState<string>('')
    const searchOpen = Boolean(searchAnchorEl)
    const openSearchMenu = (event: MouseEvent<HTMLButtonElement>) => {
        setSearchAnchorEl(event.currentTarget)
    }
    const closeSearchMenu = () => {
        setSearchAnchorEl(null)
    }

    return (
        <Grid container alignItems={'center'}>
            <Grid item xs={'auto'}>
                <IconButton size={'small'} onClick={openSearchMenu}>
                    {filter.searchString === initialMTGFilter.searchString ? (
                        <Search style={{ width: 40, height: 40 }} />
                    ) : (
                        <FindReplace style={{ width: 40, height: 40 }} />
                    )}
                </IconButton>
                <Popover
                    anchorEl={searchAnchorEl}
                    open={searchOpen}
                    onClose={closeSearchMenu}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                >
                    <Box padding={2} maxWidth={500}>
                        <TextField
                            autoFocus
                            variant={'outlined'}
                            label={'Search'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setSearch('')}>
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            helperText={
                                'Search for cards by name or use specific queries. You can filter by card type with t:, rarity with r:, set with set:, color with c:, or mana cost (CMC) with cmc= or comparisons like cmc>, cmc<, cmc>=, cmc<=. Separate multiple queries with ; to combine them (AND logic applies). Use ! to negate a filter (e.g., !r:mythic for all non-mythic cards). Color filters accept multiple colors (e.g., c:rg for red and green). Searches include card names, types, sets, descriptions, and flavor text.'
                            }
                            onKeyUp={(e) => {
                                if (e.key === 'Enter') {
                                    setFilter({ ...filter, searchString: search })
                                    closeSearchMenu()
                                }
                            }}
                        />
                        <Box display={'flex'} columnGap={1} marginTop={1}>
                            <Button
                                variant={'contained'}
                                onClick={() => {
                                    setFilter({ ...filter, searchString: search })
                                    closeSearchMenu()
                                }}
                            >
                                Search
                            </Button>
                            <Button
                                variant={'contained'}
                                onClick={() => {
                                    setSearch('')
                                    setFilter({ ...filter, searchString: '' })
                                    closeSearchMenu()
                                }}
                            >
                                Clear
                            </Button>
                        </Box>
                    </Box>
                </Popover>
            </Grid>
            <ManaSelector
                next={(c) => {
                    setFilter({ ...filter, color: { ...filter.color, [c]: nextTB(filter.color[c]) } })
                }}
                prev={(c) => {
                    setFilter({ ...filter, color: { ...filter.color, [c]: prevTB(filter.color[c]) } })
                }}
                selected={filter.color}
                iconSize={30}
                multi={{
                    next: () => {
                        setFilter({ ...filter, multiColor: nextTB(filter.multiColor) })
                    },
                    prev: () => {
                        setFilter({ ...filter, multiColor: prevTB(filter.multiColor) })
                    },
                    value: filter.multiColor,
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <RaritySelector
                onNext={(r) => {
                    setFilter({
                        ...filter,
                        rarity: { ...filter.rarity, [r]: nextTB(filter.rarity[r]) },
                    })
                }}
                onPrev={(r) => {
                    setFilter({
                        ...filter,
                        rarity: { ...filter.rarity, [r]: prevTB(filter.rarity[r]) },
                    })
                }}
                selected={filter.rarity}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <CMCSelector
                onNext={(cmc) => {
                    setFilter({
                        ...filter,
                        manaCosts: { ...filter.manaCosts, [cmc]: nextTB(filter.manaCosts[cmc]) },
                    })
                }}
                onPrev={(cmc) => {
                    setFilter({
                        ...filter,
                        manaCosts: { ...filter.manaCosts, [cmc]: prevTB(filter.manaCosts[cmc]) },
                    })
                }}
                selected={filter.manaCosts}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <TypeSelector
                onNext={(type) => {
                    setFilter({
                        ...filter,
                        cardTypes: { ...filter.cardTypes, [type]: nextTB(filter.cardTypes[type]) },
                    })
                }}
                onPrev={(type) => {
                    setFilter({
                        ...filter,
                        cardTypes: { ...filter.cardTypes, [type]: prevTB(filter.cardTypes[type]) },
                    })
                }}
                selected={filter.cardTypes}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <SetSelector
                onNext={(setName) => {
                    setFilter((filter) => ({
                        ...filter,
                        sets: {
                            ...filter.sets,
                            [setName]: { ...filter.sets[setName], value: nextTB(filter.sets[setName].value) },
                        },
                    }))
                }}
                onPrev={(setName) => {
                    setFilter((filter) => ({
                        ...filter,
                        sets: {
                            ...filter.sets,
                            [setName]: { ...filter.sets[setName], value: prevTB(filter.sets[setName].value) },
                        },
                    }))
                }}
                setValue={(setName, value) => {
                    setFilter((filter) => ({
                        ...filter,
                        sets: { ...filter.sets, [setName]: { ...filter.sets[setName], value: value } },
                    }))
                }}
                selected={Object.entries(filter.sets).reduce((acc, [key, value]) => {
                    acc[key] = value.value
                    return acc
                }, {} as Record<string, TernaryBoolean>)}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <LegalitySelector
                selected={filter.legalities}
                onSelect={(format, legalityValue, value) => {
                    setFilter({
                        ...filter,
                        legalities: {
                            ...filter.legalities,
                            [format]: {
                                ...filter.legalities[format],
                                [legalityValue]: value,
                            },
                        },
                    })
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <LayoutSelector
                selected={filter.layouts}
                onNext={(layout) => {
                    setFilter({ ...filter, layouts: { ...filter.layouts, [layout]: nextTB(filter.layouts[layout]) } })
                }}
                onPrev={(layout) => {
                    setFilter({
                        ...filter,
                        layouts: { ...filter.layouts, [layout]: prevTB(filter.layouts[layout]) },
                    })
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <GameSelector
                selected={filter.games}
                onNext={(game) => {
                    setFilter({ ...filter, games: { ...filter.games, [game]: nextTB(filter.games[game]) } })
                }}
                onPrev={(game) => {
                    setFilter({ ...filter, games: { ...filter.games, [game]: prevTB(filter.games[game]) } })
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <SortSelector />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <RatingSelector
                onSetMax={(max) => {
                    setFilter((prev) => ({
                        ...prev,
                        rating: {
                            ...prev.rating,
                            max,
                        },
                    }))
                }}
                onSetMin={(min) => {
                    setFilter((prev) => ({
                        ...prev,
                        rating: {
                            ...prev.rating,
                            min,
                        },
                    }))
                }}
                selected={{
                    min: filter.rating.min ?? 0,
                    max: filter.rating.max ?? 0,
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <TagSelector
                selected={filter.tags}
                onNext={(tag) => {
                    setFilter((prev) => ({
                        ...prev,
                        tags: {
                            ...prev.tags,
                            [tag]: nextTB(prev.tags[tag]),
                        },
                    }))
                }}
                onPrev={(tag) => {
                    setFilter((prev) => ({
                        ...prev,
                        tags: {
                            ...prev.tags,
                            [tag]: prevTB(prev.tags[tag]),
                        },
                    }))
                }}
            />
            <FormControlLabel
                value={filter.hideIgnored}
                control={<Switch color="primary" />}
                label="Hide Ignored"
                labelPlacement="bottom"
                onChange={(_, c) =>
                    setFilter({
                        ...filter,
                        hideIgnored: c,
                    })
                }
            />
            {isMobile && (
                <IconButton
                    onClick={() => setStickyCardsGrid((prev) => !prev)}
                    title={stickyCardsGrid ? 'Sticky CardsGrid enabled' : 'Sticky CardsGrid disabled'}
                    sx={{ ml: 1 }}
                >
                    {stickyCardsGrid ? <PushPinIcon color="primary" /> : <PushPinOutlinedIcon />}
                </IconButton>
            )}
        </Grid>
    )
}
