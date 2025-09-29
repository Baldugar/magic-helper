import { CMCFilter, initialMTGFilter, MTGFilterType, SetFilter } from '../../context/MTGA/Filter/MTGFilterContext'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import {
    MTG_Color,
    MTG_Filter_SortBy,
    MTG_Filter_SortDirection,
    MTG_Game,
    MTG_Layout,
    MTG_Rarity,
    TernaryBoolean,
} from '../../graphql/types'

export type LocalStoreFilter = {
    filter: MTGFilterType
    page: number
    hash: number
    sort: {
        sortBy: MTG_Filter_SortBy
        sortDirection: MTG_Filter_SortDirection
        enabled: boolean
    }[]
}

// This function calculates the hash of the filter and the page
export const calculateHash = (filter: MTGFilterType) => {
    const newFilter = initialMTGFilter
    newFilter.cardTypes = Object.keys(filter.cardTypes).reduce((acc, key) => {
        acc[key] = TernaryBoolean.UNSET
        return acc
    }, {} as Record<string, TernaryBoolean>)
    newFilter.sets = Object.entries(filter.sets).reduce((acc, [key, value]) => {
        acc[key] = {
            setName: value.setName,
            value: TernaryBoolean.UNSET,
            imageURL: value.imageURL,
            releasedAt: value.releasedAt,
            setType: value.setType,
            games: value.games,
        }
        return acc
    }, {} as Record<string, SetFilter>)
    newFilter.subtypes = Object.entries(filter.subtypes).reduce((acc, [key, value]) => {
        acc[key] = Object.keys(value).reduce((acc2, key2) => {
            acc2[key2] = TernaryBoolean.UNSET
            return acc2
        }, {} as Record<string, TernaryBoolean>)
        return acc
    }, {} as Record<string, Record<string, TernaryBoolean>>)
    const str = JSON.stringify(newFilter)
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
    }
    return hash
}

export const useLocalStoreFilter = () => {
    const { filter, setFilter, sort, setSort } = useMTGFilter()

    const saveLocalStoreFilter = () => {
        const hash = calculateHash(filter)
        const localStoreFilter = { filter, page: filter.page, hash, sort }
        localStorage.setItem('localStoreFilter', JSON.stringify(localStoreFilter))
    }

    const loadLocalStoreFilter = () => {
        const localStoreFilter = localStorage.getItem('localStoreFilter')
        if (localStoreFilter) {
            const { filter: newFilter, page, hash, sort } = JSON.parse(localStoreFilter) as LocalStoreFilter
            if (hash === calculateHash(filter)) {
                setFilter((prev) => ({ ...prev, ...newFilter, page }))
                setSort(sort)
            } else {
                alert('Local store filter is outdated, trying to load it anyway')

                const filterToSet = { ...filter }

                // filterToSet.cardTypes
                Object.keys(filterToSet.cardTypes).forEach((key) => {
                    if (newFilter.cardTypes[key]) {
                        filterToSet.cardTypes[key] = newFilter.cardTypes[key]
                    }
                })

                // filterToSet.color
                Object.keys(filterToSet.color).forEach((key) => {
                    const k = key as MTG_Color
                    if (newFilter.color[k]) {
                        filterToSet.color[k] = newFilter.color[k]
                    }
                })

                // filterToSet.rarity
                Object.keys(filterToSet.rarity).forEach((key) => {
                    const k = key as MTG_Rarity
                    if (newFilter.rarity[k]) {
                        filterToSet.rarity[k] = newFilter.rarity[k]
                    }
                })

                // filterToSet.sets
                Object.keys(filterToSet.sets).forEach((key) => {
                    const k = key as string
                    if (newFilter.sets[k]) {
                        filterToSet.sets[k].value = newFilter.sets[k].value
                    }
                })

                // filterToSet.games
                Object.keys(filterToSet.games).forEach((key) => {
                    const k = key as MTG_Game
                    if (newFilter.games[k]) {
                        filterToSet.games[k] = newFilter.games[k]
                    }
                })

                // filterToSet.layouts
                Object.keys(filterToSet.layouts).forEach((key) => {
                    const k = key as MTG_Layout
                    if (newFilter.layouts[k]) {
                        filterToSet.layouts[k] = newFilter.layouts[k]
                    }
                })

                // filterToSet.legalities
                Object.keys(filterToSet.legalities).forEach((key) => {
                    const k = key as string
                    if (newFilter.legalities[k]) {
                        filterToSet.legalities[k] = newFilter.legalities[k]
                    }
                })

                // filterToSet.manaCosts
                Object.keys(filterToSet.manaCosts).forEach((key) => {
                    const k = key as CMCFilter
                    if (newFilter.manaCosts[k]) {
                        filterToSet.manaCosts[k] = newFilter.manaCosts[k]
                    }
                })

                // filterToSet.subtypes
                Object.keys(filterToSet.subtypes).forEach((key) => {
                    const k = key as string
                    if (newFilter.subtypes[k]) {
                        filterToSet.subtypes[k] = newFilter.subtypes[k]
                    }
                })

                // filterToSet.multiColor
                filterToSet.multiColor = newFilter.multiColor

                // filterToSet.hideIgnored
                filterToSet.hideIgnored = newFilter.hideIgnored

                // filterToSet.searchString
                filterToSet.searchString = newFilter.searchString
                filterToSet.pageSize = newFilter.pageSize ?? filterToSet.pageSize
                filterToSet.fillAvailableSpace =
                    newFilter.fillAvailableSpace ?? filterToSet.fillAvailableSpace

                setFilter((prev) => ({ ...prev, ...filterToSet, page }))
                setSort(sort)
            }
        }
    }

    return { saveLocalStoreFilter, loadLocalStoreFilter }
}
