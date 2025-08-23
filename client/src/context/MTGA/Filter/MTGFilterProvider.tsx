import { useMediaQuery } from '@mui/material'
import { cloneDeep } from 'lodash'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import getMTGAFilters from '../../../graphql/MTGA/queries/getMTGFilters'
import {
    MTG_Color,
    MTG_Filter_SortBy,
    MTG_Filter_SortDirection,
    MTG_Game,
    MTG_Layout,
    MTG_Rarity,
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
    const isMobile = useMediaQuery('(max-width: 600px)')

    const [sort, setSort] = useState(
        initialSortOrder.map((key) => ({
            sortBy: key,
            sortDirection: MTG_Filter_SortDirection.ASC,
            enabled: true,
        })),
    )
    const [zoom, setZoom] = useState<'IN' | 'OUT'>('OUT')

    // useEffect(() => {
    //     setPage(0)
    // }, [filter, isMobile])

    useEffect(() => {
        fetchData<Query>(getMTGAFilters).then((data) => {
            if (!data) throw new Error('No data from getMTGFilters')
            const result = data.data.getMTGFilters
            const cardTags = data.data.cardTags
            const deckTags = data.data.deckTags
            setFilter((prev) => {
                // prev = cloneDeep(initialMTGFilter) IS THIS NEEDED??
                for (const key of result.types) {
                    prev.cardTypes[key.cardType] = TernaryBoolean.UNSET
                    prev.subtypes[key.cardType] = {}
                    for (const subtype of key.subtypes) {
                        prev.subtypes[key.cardType][subtype] = TernaryBoolean.UNSET
                    }
                }
                for (const key of result.expansions) {
                    prev.sets[key.set] = {
                        setName: key.setName,
                        value: TernaryBoolean.UNSET,
                        imageURL: key.imageURL,
                        releasedAt: key.releasedAt,
                        setType: key.setType,
                        games: key.games,
                    }
                }
                for (const format of result.legality.formats) {
                    prev.legalities[format] = {}
                    for (const legalityValue of result.legality.legalityValues) {
                        prev.legalities[format][legalityValue] = TernaryBoolean.UNSET
                    }
                }
                for (const layout of result.layouts) {
                    prev.layouts[layout] = TernaryBoolean.UNSET
                }
                for (const tag of cardTags || []) {
                    prev.tags[tag.name] = TernaryBoolean.UNSET
                }
                for (const tag of deckTags || []) {
                    prev.tags[tag.name] = TernaryBoolean.UNSET
                }
                prev.page = 0
                setOriginalFilter({ ...prev })
                return { ...prev }
            })
        })
    }, [])

    // This useEffect is used to only show sets that are relevant to the selected games
    // useEffect(() => {
    //     const games = filter.games
    //     const positiveGames = Object.entries(games)
    //         .filter(([_, value]) => isPositiveTB(value))
    //         .map(([key]) => key as MTG_Game)
    //     const negativeGames = Object.entries(games)
    //         .filter(([_, value]) => isNegativeTB(value))
    //         .map(([key]) => key as MTG_Game)
    //     const gameFilterIsNotSet = Object.values(games).every((value) => value === TernaryBoolean.UNSET)
    //     if (gameFilterIsNotSet) return
    //     setFilter((prev) => {
    //         const newSets = Object.entries(prev.sets).reduce<Record<string, SetFilter>>((acc, [code, set]) => {
    //             let shouldAdd = false
    //             if (positiveGames.length > 0) {
    //                 shouldAdd = positiveGames.some((game) => set.games.includes(game))
    //             }
    //             if (negativeGames.length > 0) {
    //                 shouldAdd = !negativeGames.some((game) => set.games.includes(game))
    //             }
    //             if (!shouldAdd) {
    //                 acc[code] = { ...set, value: TernaryBoolean.UNSET }
    //             }
    //             return acc
    //         }, prev.sets)
    //         return { ...prev, sets: newSets }
    //     })
    // }, [filter.games])

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
            toReturn.pagination = {
                page: filter.page,
                pageSize: isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP,
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
            toReturn.filter.rating = {
                max: filter.rating.max,
                min: filter.rating.min,
            }
            toReturn.filter.searchString = filter.searchString
            const sets = Object.entries(filter.sets).filter(([_, value]) => isNotUnsetTB(value.value))
            toReturn.filter.sets = sets.map(([key, value]) => ({
                set: key,
                value: value.value,
            }))
            // const subtypes = Object.entries(filter.subtypes).filter(([_, value]) => Object.values(value).some(isNotUnsetTB))
            // TODO: Add subtypes
            toReturn.filter.subtypes = []
            toReturn.filter.tags = Object.entries(filter.tags)
                .filter(([_, value]) => isNotUnsetTB(value))
                .map(([key, value]) => ({
                    tag: key,
                    value,
                }))

            toReturn.filter.deckID = filter.deckID
            toReturn.filter.commander = filter.commander
            toReturn.filter.isSelectingCommander = filter.isSelectingCommander

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
            }}
        >
            {children}
        </MTGFilterContext.Provider>
    )
}
