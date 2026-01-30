import { ReactNode, useCallback, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card } from '../../../graphql/types'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [cards, setCards] = useState<MTG_Card[]>([])

    const { convertedFilters, setFilter } = useMTGFilter()
    const { queries: { getMTGCardsFilteredQuery } } = MTGFunctions

    const { filter: filterArgs, sort: sortArgs, pagination: paginationArgs } = convertedFilters
    const activePage = paginationArgs.page ?? 0
    const pageSize = paginationArgs.pageSize ?? 1

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const page = Math.max(0, activePage)
        getMTGCardsFilteredQuery({
            filter: filterArgs,
            sort: sortArgs,
            pagination: { ...paginationArgs, page },
        })
            .then((response) => {
                if (!cancelled) {
                    setCards(response.pagedCards)
                    setTotalCount(response.totalCount)
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Failed to fetch MTG cards', err)
                    setCards([])
                    setTotalCount(0)
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [activePage, filterArgs, sortArgs, paginationArgs, getMTGCardsFilteredQuery])

    const goToPage = useCallback(
        (targetPage: number) => {
            const normalized = Math.max(0, targetPage)
            const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0
            const page = totalPages > 0 ? Math.min(normalized, totalPages - 1) : normalized
            setFilter((prev) => ({ ...prev, page }))
            return Promise.resolve()
        },
        [pageSize, setFilter, totalCount],
    )

    const refetch = useCallback(() => {
        const page = Math.max(0, activePage)
        return getMTGCardsFilteredQuery({
            filter: filterArgs,
            sort: sortArgs,
            pagination: { ...paginationArgs, page },
        }).then((response) => {
            setCards(response.pagedCards)
            setTotalCount(response.totalCount)
        })
    }, [activePage, filterArgs, sortArgs, paginationArgs, getMTGCardsFilteredQuery])

    return (
        <MTGCardsContext.Provider value={{ cards, loading, totalCount, goToPage, refetch }}>
            {children}
        </MTGCardsContext.Provider>
    )
}
