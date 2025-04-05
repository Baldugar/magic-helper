import { cloneDeep } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import getMTGAFilters from '../../../graphql/MTGA/queries/getMTGFilters'
import { Query, QuerygetMTGFiltersArgs } from '../../../graphql/types'
import { TernaryBoolean } from '../../../types/ternaryBoolean'
import { fetchData } from '../../../utils/functions/fetchData'
import { useSystem } from '../System/useSystem'
import { initialMTGFilter, MTGFilterContext, MTGFilterType, SortDirection, SortEnum } from './MTGFilterContext'

export const MTGAFilterProvider = ({ children }: { children: ReactNode }) => {
    const [filter, setFilter] = useState<MTGFilterType>(initialMTGFilter)
    const [originalFilter, setOriginalFilter] = useState<MTGFilterType>(initialMTGFilter)
    const { list } = useSystem()

    const [sort, setSort] = useState(
        Object.values(SortEnum).map((key) => ({
            sortBy: key,
            sortDirection: SortDirection.ASC,
            enabled: true,
        })),
    )
    const [zoom, setZoom] = useState<'IN' | 'OUT'>('OUT')

    useEffect(() => {
        if (Object.keys(filter.cardTypes).length) return
        fetchData<Query, QuerygetMTGFiltersArgs>(getMTGAFilters, { list }).then((data) => {
            if (!data) throw new Error('No data from getMTGFilters')
            const result = data.data.getMTGFilters
            setFilter((prev) => {
                prev = cloneDeep([initialMTGFilter])[0]
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
                    }
                }
                for (const key of result.legality.formats) {
                    prev.legalityFormats.push(key)
                }
                for (const key of result.legality.legalityValues) {
                    prev.legalityValues.push(key)
                }
                setOriginalFilter({ ...prev })
                return { ...prev }
            })
        })
    }, [filter.cardTypes, list])

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
