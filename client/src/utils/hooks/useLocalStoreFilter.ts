import { useMTGADeckCreatorPagination } from '../../context/MTGA/DeckCreatorPagination/useMTGADeckCreatorPagination'
import { initialMTGAFilter, MTGAFilterType, SortDirection, SortEnum } from '../../context/MTGA/Filter/MTGAFilterContext'
import { useMTGAFilter } from '../../context/MTGA/Filter/useMTGAFilter'
import { TernaryBoolean } from '../../types/ternaryBoolean'

export type LocalStoreFilter = {
    filter: MTGAFilterType
    page: number
    hash: number
    sort: {
        sortBy: SortEnum
        sortDirection: SortDirection
        enabled: boolean
    }[]
}

// This function calculates the hash of the filter and the page
export const calculateHash = (filter: MTGAFilterType) => {
    const newFilter = initialMTGAFilter
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
        }
        return acc
    }, {} as Record<string, { setName: string; value: TernaryBoolean; imageURL: string; releasedAt: number }>)
    newFilter.subtypes = Object.entries(filter.subtypes).reduce((acc, [key, value]) => {
        acc[key] = Object.keys(value).reduce((acc2, key2) => {
            acc2[key2] = TernaryBoolean.UNSET
            return acc2
        }, {} as Record<string, TernaryBoolean>)
        return acc
    }, {} as Record<string, Record<string, TernaryBoolean>>)
    newFilter.legalityFormats = filter.legalityFormats
    newFilter.legalityValues = filter.legalityValues
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
    const { page, setPage } = useMTGADeckCreatorPagination()
    const { filter, setFilter, sort, setSort } = useMTGAFilter()

    const saveLocalStoreFilter = () => {
        const hash = calculateHash(filter)
        const localStoreFilter = { filter, page, hash, sort }
        localStorage.setItem('localStoreFilter', JSON.stringify(localStoreFilter))
    }

    const loadLocalStoreFilter = () => {
        const localStoreFilter = localStorage.getItem('localStoreFilter')
        if (localStoreFilter) {
            const { filter, page, hash, sort } = JSON.parse(localStoreFilter) as LocalStoreFilter
            if (hash === calculateHash(filter)) {
                setFilter(filter)
                setSort(sort)
                setTimeout(() => setPage(page), 50)
            } else {
                // localStorage.removeItem('localStoreFilter')
                alert('Local store filter is outdated')
            }
        }
    }

    return { saveLocalStoreFilter, loadLocalStoreFilter }
}
