import { cloneDeep } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import getMTGAFilters from '../../../graphql/MTGA/queries/getMTGAFilters'
import { Query } from '../../../graphql/types'
import { TernaryBoolean } from '../../../types/ternaryBoolean'
import { fetchData } from '../../../utils/functions/fetchData'
import { initialMTGAFilter, MTGAFilterContext, MTGAFilterType, SortDirection, SortEnum } from './MTGAFilterContext'

export const MTGAFilterProvider = ({ children }: { children: ReactNode }) => {
    const [filter, setFilter] = useState<MTGAFilterType>(initialMTGAFilter)
    const [originalFilter, setOriginalFilter] = useState<MTGAFilterType>(initialMTGAFilter)

    const [sort, setSort] = useState({
        sortBy: SortEnum.NAME,
        sortDirection: SortDirection.ASC,
    })
    const [zoom, setZoom] = useState<'IN' | 'OUT'>('OUT')

    useEffect(() => {
        if (Object.keys(filter.cardTypes).length) return
        fetchData<Query>(getMTGAFilters, undefined).then((data) => {
            if (!data) throw new Error('No data from getMTGAFilters')
            const result = data.data.getMTGAFilters
            setFilter((prev) => {
                prev = cloneDeep([initialMTGAFilter])[0]
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
    }, [filter.cardTypes])

    return (
        <MTGAFilterContext.Provider
            value={{
                filter,
                setFilter,
                originalFilter,
                setOriginalFilter,
                sort,
                setSort,
                zoom,
                setZoom,
            }}
        >
            {children}
        </MTGAFilterContext.Provider>
    )
}
