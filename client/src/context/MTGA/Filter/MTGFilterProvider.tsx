import { cloneDeep } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import getMTGAFilters from '../../../graphql/MTGA/queries/getMTGFilters'
import { MTG_Game, Query } from '../../../graphql/types'
import { isNegativeTB, isPositiveTB, TernaryBoolean } from '../../../types/ternaryBoolean'
import { fetchData } from '../../../utils/functions/fetchData'
import {
    initialMTGFilter,
    MTGFilterContext,
    MTGFilterType,
    SetFilter,
    SortDirection,
    SortEnum,
} from './MTGFilterContext'

const initialSortOrder = [
    SortEnum.COLOR,
    SortEnum.CMC,
    SortEnum.NAME,
    SortEnum.RARITY,
    SortEnum.SET,
    SortEnum.RELEASED_AT,
]

export const MTGAFilterProvider = ({ children }: { children: ReactNode }) => {
    const [filter, setFilter] = useState<MTGFilterType>(initialMTGFilter)
    const [originalFilter, setOriginalFilter] = useState<MTGFilterType>(initialMTGFilter)

    const [sort, setSort] = useState(
        initialSortOrder.map((key) => ({
            sortBy: key,
            sortDirection: SortDirection.ASC,
            enabled: true,
        })),
    )
    const [zoom, setZoom] = useState<'IN' | 'OUT'>('OUT')

    useEffect(() => {
        fetchData<Query>(getMTGAFilters).then((data) => {
            if (!data) throw new Error('No data from getMTGFilters')
            const result = data.data.getMTGFilters
            const cardTags = data.data.cardTags
            const deckTags = data.data.deckTags
            setFilter((prev) => {
                prev = cloneDeep(initialMTGFilter)
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
                setOriginalFilter({ ...prev })
                return { ...prev }
            })
        })
    }, [])

    useEffect(() => {
        const games = filter.games
        const positiveGames = Object.entries(games)
            .filter(([_, value]) => isPositiveTB(value))
            .map(([key]) => key as MTG_Game)
        const negativeGames = Object.entries(games)
            .filter(([_, value]) => isNegativeTB(value))
            .map(([key]) => key as MTG_Game)
        const gameFilterIsNotSet = Object.values(games).every((value) => value === TernaryBoolean.UNSET)
        if (gameFilterIsNotSet) return
        setFilter((prev) => {
            const newSets = Object.entries(prev.sets).reduce<Record<string, SetFilter>>((acc, [code, set]) => {
                let shouldAdd = false
                if (positiveGames.length > 0) {
                    shouldAdd = positiveGames.some((game) => set.games.includes(game))
                }
                if (negativeGames.length > 0) {
                    shouldAdd = !negativeGames.some((game) => set.games.includes(game))
                }
                if (!shouldAdd) {
                    acc[code] = { ...set, value: TernaryBoolean.UNSET }
                }
                return acc
            }, prev.sets)
            return { ...prev, sets: newSets }
        })
    }, [filter.games])

    const clearFilter = () => {
        setFilter(originalFilter)
    }

    return (
        <MTGFilterContext.Provider
            value={{
                filter,
                setFilter,
                clearFilter,
                originalFilter,
                setOriginalFilter,
                sort,
                setSort,
                zoom,
                setZoom,
            }}
        >
            {children}
        </MTGFilterContext.Provider>
    )
}
