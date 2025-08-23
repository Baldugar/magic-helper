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
import { TernaryBoolean } from '../../../graphql/types'
import { nextTB, prevTB } from '../../../types/ternaryBoolean'

export const Filters = () => {
    const { filter, setFilter, setIgnoredCardIDs } = useMTGFilter()
    const { stickyCardsGrid, setStickyCardsGrid, deck } = useMTGDeckCreator()
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
                                    setFilter((prev) => ({ ...prev, searchString: search, page: 0 }))
                                    closeSearchMenu()
                                }
                            }}
                        />
                        <Box display={'flex'} columnGap={1} marginTop={1}>
                            <Button
                                variant={'contained'}
                                onClick={() => {
                                    setFilter((prev) => ({ ...prev, searchString: search, page: 0 }))
                                    closeSearchMenu()
                                }}
                            >
                                Search
                            </Button>
                            <Button
                                variant={'contained'}
                                onClick={() => {
                                    setSearch('')
                                    setFilter((prev) => ({ ...prev, searchString: '', page: 0 }))
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
                    setFilter((prev) => ({ ...prev, color: { ...prev.color, [c]: nextTB(prev.color[c]) }, page: 0 }))
                }}
                prev={(c) => {
                    setFilter((prev) => ({ ...prev, color: { ...prev.color, [c]: prevTB(prev.color[c]) }, page: 0 }))
                }}
                selected={filter.color}
                iconSize={30}
                multi={{
                    next: () => {
                        setFilter((prev) => ({ ...prev, multiColor: nextTB(prev.multiColor), page: 0 }))
                    },
                    prev: () => {
                        setFilter((prev) => ({ ...prev, multiColor: prevTB(prev.multiColor), page: 0 }))
                    },
                    value: filter.multiColor,
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <RaritySelector
                onNext={(r) => {
                    setFilter((prev) => ({
                        ...prev,
                        rarity: { ...prev.rarity, [r]: nextTB(prev.rarity[r]) },
                        page: 0,
                    }))
                }}
                onPrev={(r) => {
                    setFilter((prev) => ({
                        ...prev,
                        rarity: { ...prev.rarity, [r]: prevTB(prev.rarity[r]) },
                        page: 0,
                    }))
                }}
                selected={filter.rarity}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <CMCSelector
                onNext={(cmc) => {
                    setFilter((prev) => ({
                        ...prev,
                        manaCosts: { ...prev.manaCosts, [cmc]: nextTB(prev.manaCosts[cmc]) },
                        page: 0,
                    }))
                }}
                onPrev={(cmc) => {
                    setFilter((prev) => ({
                        ...prev,
                        manaCosts: { ...prev.manaCosts, [cmc]: prevTB(prev.manaCosts[cmc]) },
                        page: 0,
                    }))
                }}
                selected={filter.manaCosts}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <TypeSelector
                onNext={(type) => {
                    setFilter((prev) => ({
                        ...prev,
                        cardTypes: { ...prev.cardTypes, [type]: nextTB(prev.cardTypes[type]) },
                        page: 0,
                    }))
                }}
                onPrev={(type) => {
                    setFilter((prev) => ({
                        ...prev,
                        cardTypes: { ...prev.cardTypes, [type]: prevTB(prev.cardTypes[type]) },
                        page: 0,
                    }))
                }}
                selected={filter.cardTypes}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <SetSelector
                onNext={(setName) => {
                    setFilter((prev) => ({
                        ...prev,
                        sets: {
                            ...prev.sets,
                            [setName]: { ...prev.sets[setName], value: nextTB(prev.sets[setName].value) },
                        },
                        page: 0,
                    }))
                }}
                onPrev={(setName) => {
                    setFilter((prev) => ({
                        ...prev,
                        sets: {
                            ...prev.sets,
                            [setName]: { ...prev.sets[setName], value: prevTB(prev.sets[setName].value) },
                        },
                        page: 0,
                    }))
                }}
                setValue={(setName, value) => {
                    setFilter((prev) => ({
                        ...prev,
                        page: 0,
                        sets: { ...prev.sets, [setName]: { ...prev.sets[setName], value: value } },
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
                    setFilter((prev) => ({
                        ...prev,
                        legalities: {
                            ...prev.legalities,
                            [format]: {
                                ...prev.legalities[format],
                                [legalityValue]: value,
                            },
                        },
                        page: 0,
                    }))
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <LayoutSelector
                selected={filter.layouts}
                onNext={(layout) => {
                    setFilter((prev) => ({
                        ...prev,
                        layouts: { ...prev.layouts, [layout]: nextTB(prev.layouts[layout]) },
                        page: 0,
                    }))
                }}
                onPrev={(layout) => {
                    setFilter((prev) => ({
                        ...prev,
                        layouts: { ...prev.layouts, [layout]: prevTB(prev.layouts[layout]) },
                        page: 0,
                    }))
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <GameSelector
                selected={filter.games}
                onNext={(game) => {
                    setFilter((prev) => ({
                        ...prev,
                        games: { ...prev.games, [game]: nextTB(prev.games[game]) },
                        page: 0,
                    }))
                }}
                onPrev={(game) => {
                    setFilter((prev) => ({
                        ...prev,
                        games: { ...prev.games, [game]: prevTB(prev.games[game]) },
                        page: 0,
                    }))
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
                        page: 0,
                    }))
                }}
                onSetMin={(min) => {
                    setFilter((prev) => ({
                        ...prev,
                        rating: {
                            ...prev.rating,
                            min,
                        },
                        page: 0,
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
                        page: 0,
                    }))
                }}
                onPrev={(tag) => {
                    setFilter((prev) => ({
                        ...prev,
                        tags: {
                            ...prev.tags,
                            [tag]: prevTB(prev.tags[tag]),
                        },
                        page: 0,
                    }))
                }}
            />
            <FormControlLabel
                value={filter.hideIgnored}
                control={<Switch color="primary" />}
                label="Hide Ignored"
                labelPlacement="bottom"
                onChange={(_, c) => {
                    setFilter((prev) => ({
                        ...prev,
                        hideIgnored: c,
                        page: 0,
                    }))
                    setIgnoredCardIDs(deck.ignoredCards)
                }}
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
