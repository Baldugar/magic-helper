import { useMediaQuery } from '@mui/material'
import { cloneDeep } from 'lodash'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import getMTGAFilters from '../../../graphql/MTGA/queries/getMTGFilters'
import {
    MTG_Color,
    MTG_Filter_SortBy,
    MTG_Filter_SortDirection,
    MTG_Game,
    MTG_Layout,
    MTG_Rarity,
    MTG_Tag,
    MTG_TagAssignment,
    Query,
    QuerygetMTGCardsFilteredArgs,
    TernaryBoolean,
} from '../../../graphql/types'
import { isNotUnsetTB } from '../../../types/ternaryBoolean'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../../utils/constants'
import { fetchData } from '../../../utils/functions/fetchData'
import { initialConvertedFilter, initialMTGFilter, MTGFilterContext, MTGFilterType } from './MTGFilterContext'

const initialSortOrder = [
    MTG_Filter_SortBy.COLOR,
    MTG_Filter_SortBy.CMC,
    MTG_Filter_SortBy.NAME,
    MTG_Filter_SortBy.RARITY,
    MTG_Filter_SortBy.SET,
    MTG_Filter_SortBy.RELEASED_AT,
]

export const MTGAFilterProvider = ({ children }: { children: ReactNode }) => {
    const [filter, setFilter] = useState<MTGFilterType>(initialMTGFilter)
    const [originalFilter, setOriginalFilter] = useState<MTGFilterType>(initialMTGFilter)
    const [ignoredCardIDs, setIgnoredCardIDs] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<MTG_Tag[]>([])
    const [existingChains, setExistingChains] = useState<MTG_TagAssignment[]>([])
    const isMobile = useMediaQuery('(max-width: 600px)')

    const [sort, setSort] = useState(
        initialSortOrder.map((key) => ({
            sortBy: key,
            sortDirection: MTG_Filter_SortDirection.ASC,
            enabled: true,
        })),
    )
    const [zoom, setZoom] = useState<'IN' | 'OUT'>('OUT')

    // For mobile preset pagination - get the visible card index on demand (provided by CardsGrid)
    const [getVisibleCardIndex, setGetVisibleCardIndex] = useState<() => number>(() => () => 0)
    // When set, CardsGrid should scroll to this card index after page load
    const [scrollToCardIndexAfterLoad, setScrollToCardIndexAfterLoad] = useState<number | null>(null)

    // Active preset for autosave - when set, filter changes autosave to this preset
    const [activePresetId, setActivePresetId] = useState<string | null>(null)

    const fetchTagsAndChains = useCallback(() => {
        Promise.all([
            MTGFunctions.queries.getMTGTagsQuery(),
            MTGFunctions.queries.getMTGTagChainsQuery(),
        ])
            .then(([tagsResult, chainsResult]) => {
                setAvailableTags(tagsResult)
                setExistingChains(chainsResult)
            })
            .catch(() => {
                setAvailableTags([])
                setExistingChains([])
            })
    }, [])

    useEffect(() => {
        fetchData<Query>(getMTGAFilters).then((data) => {
            if (!data) throw new Error('No data from getMTGFilters')
            const result = data.data.getMTGFilters
            setFilter((prev) => {
                // Create new objects for nested properties to ensure reference changes
                const newCardTypes = { ...prev.cardTypes }
                const newSubtypes = { ...prev.subtypes }
                const newSets = { ...prev.sets }
                const newLegalities = { ...prev.legalities }
                const newLayouts = { ...prev.layouts }

                for (const key of result.types) {
                    newCardTypes[key.cardType] = TernaryBoolean.UNSET
                    newSubtypes[key.cardType] = {}
                    for (const subtype of key.subtypes) {
                        newSubtypes[key.cardType][subtype] = TernaryBoolean.UNSET
                    }
                }
                for (const key of result.expansions) {
                    newSets[key.set] = {
                        setName: key.setName,
                        value: TernaryBoolean.UNSET,
                        imageURL: key.imageURL,
                        releasedAt: key.releasedAt,
                        setType: key.setType,
                        games: key.games,
                    }
                }
                for (const format of result.legality.formats) {
                    newLegalities[format] = {}
                    for (const legalityValue of result.legality.legalityValues) {
                        newLegalities[format][legalityValue] = TernaryBoolean.UNSET
                    }
                }
                for (const layout of result.layouts) {
                    newLayouts[layout] = TernaryBoolean.UNSET
                }

                const newFilter = {
                    ...prev,
                    cardTypes: newCardTypes,
                    subtypes: newSubtypes,
                    sets: newSets,
                    legalities: newLegalities,
                    layouts: newLayouts,
                    page: 0,
                }
                setOriginalFilter({ ...newFilter })
                return newFilter
            })
        })

        fetchTagsAndChains()
    }, [fetchTagsAndChains])

    const clearFilter = () => {
        setFilter(originalFilter)
    }

    const convertedFilters = useMemo(
        (): QuerygetMTGCardsFilteredArgs => {
            const toReturn = cloneDeep(initialConvertedFilter)
            toReturn.sort = sort
                .filter((s) => s.enabled)
                .map((s) => ({
                    sortBy: s.sortBy,
                    sortDirection: s.sortDirection,
                    enabled: true,
                }))
            const resolvedPageSize = isMobile ? PAGE_SIZE_MOBILE : filter.pageSize ?? PAGE_SIZE_DESKTOP
            toReturn.pagination = {
                page: filter.page,
                pageSize: resolvedPageSize,
            }
            const cardTypes = Object.entries(filter.cardTypes).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.cardTypes = cardTypes.map(([key, value]) => ({
                cardType: key,
                value,
            }))
            const colors = Object.entries(filter.color).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.color = colors.map(([key, value]) => ({
                color: key as MTG_Color,
                value,
            }))
            const multiColor = filter.multiColor
            toReturn.filter.multiColor = multiColor
            const games = Object.entries(filter.games).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.games = games.map(([key, value]) => ({
                game: key as MTG_Game,
                value,
            }))
            toReturn.filter.hideIgnored = filter.hideIgnored
            toReturn.filter.hideUnreleased = filter.hideUnreleased
            const layouts = Object.entries(filter.layouts).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.layouts = layouts.map(([key, value]) => ({
                layout: key as MTG_Layout,
                value,
            }))
            const legalities = Object.entries(filter.legalities).filter(([_, value]) =>
                Object.values(value).some(isNotUnsetTB),
            )
            toReturn.filter.legalities = legalities.map(([key, value]) => ({
                format: key,
                legalityEntries: Object.entries(value)
                    .filter(([_, value]) => isNotUnsetTB(value))
                    .map(([key, value]) => ({
                        legalityValue: key,
                        value,
                    })),
            }))
            const manaCosts = Object.entries(filter.manaCosts).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.manaCosts = manaCosts.map(([key, value]) => ({
                manaCost: key,
                value,
            }))
            const rarities = Object.entries(filter.rarity).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.rarity = rarities.map(([key, value]) => ({
                rarity: key as MTG_Rarity,
                value,
            }))
            toReturn.filter.searchString = filter.searchString
            const sets = Object.entries(filter.sets).filter(([_, value]) => isNotUnsetTB(value.value))
            toReturn.filter.sets = sets.map(([key, value]) => ({
                set: key,
                value: value.value,
            }))
            // const subtypes = Object.entries(filter.subtypes).filter(([_, value]) => Object.values(value).some(isNotUnsetTB))
            // TODO: Add subtypes
            toReturn.filter.subtypes = []

            toReturn.filter.deckID = filter.deckID
            toReturn.filter.commander = filter.commander
            toReturn.filter.isSelectingCommander = filter.isSelectingCommander

            const tags = Object.entries(filter.tags).filter(([_, value]) => isNotUnsetTB(value))
            toReturn.filter.tags = tags.map(([tagID, value]) => ({ tagID, value }))

            // Convert chains - only include chains with non-UNSET values
            const activeChains = filter.chains.filter((c) => isNotUnsetTB(c.value))
            toReturn.filter.chains = activeChains.map((c) => ({
                terminalTagID: c.terminalTagID,
                chainTagIDs: c.chainTagIDs,
                value: c.value,
            }))

            return toReturn
        },
        // ignoredCardIDs is not used but is needed to trigger the filtering if the user has the "Hide Ignored" filter enabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filter, sort, isMobile, ignoredCardIDs],
    )

    return (
        <MTGFilterContext.Provider
            value={{
                filter,
                setFilter,
                clearFilter,
                originalFilter,
                setOriginalFilter,
                setIgnoredCardIDs,
                sort,
                setSort,
                zoom,
                setZoom,
                convertedFilters,
                availableTags,
                existingChains,
                refetchTagsAndChains: fetchTagsAndChains,
                getVisibleCardIndex,
                setGetVisibleCardIndex,
                scrollToCardIndexAfterLoad,
                setScrollToCardIndexAfterLoad,
                activePresetId,
                setActivePresetId,
            }}
        >
            {children}
        </MTGFilterContext.Provider>
    )
}
