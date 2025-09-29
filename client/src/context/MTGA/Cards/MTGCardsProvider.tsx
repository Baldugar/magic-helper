import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, RatableEntityType } from '../../../graphql/types'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGCardsContext } from './MTGCardsContext'

const PREFETCH_RADIUS = 2

type PageCache = Record<number, MTG_Card[]>

const ratingPayload = (rating: number) => ({
    user: {
        ID: 'USER_ID',
        roles: [],
    },
    value: rating,
})

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [pageCache, setPageCache] = useState<PageCache>({})

    const pageCacheRef = useRef<PageCache>({})
    const inFlightRef = useRef<Set<string>>(new Set())
    const baseSignatureRef = useRef<string>('')

    const { convertedFilters, setFilter } = useMTGFilter()

    const {
        queries: { getMTGCardsFilteredQuery },
        mutations: { rateMutation },
    } = MTGFunctions

    const filterArgs = convertedFilters.filter
    const sortArgs = convertedFilters.sort
    const paginationArgs = convertedFilters.pagination

    const activePage = paginationArgs.page ?? 0
    const pageSize = paginationArgs.pageSize ?? 1

    const baseFilterKey = useMemo(
        () =>
            JSON.stringify({
                filter: filterArgs,
                sort: sortArgs,
                pageSize,
            }),
        [filterArgs, sortArgs, pageSize],
    )

    useEffect(() => {
        baseSignatureRef.current = baseFilterKey
    }, [baseFilterKey])

    useEffect(() => {
        pageCacheRef.current = pageCache
    }, [pageCache])

    useEffect(() => {
        setPageCache({})
        pageCacheRef.current = {}
        inFlightRef.current.clear()
        setTotalCount(0)
        setLoading(true)
    }, [baseFilterKey])

    const fetchPage = useCallback(
        async (page: number, options: { markActive?: boolean } = {}): Promise<void> => {
            const { markActive = false } = options
            const normalizedPage = Math.max(0, page)

            if (pageCacheRef.current[normalizedPage]) {
                if (markActive) {
                    setLoading(false)
                }
                return
            }

            const inFlightKey = baseFilterKey + ':' + normalizedPage
            if (inFlightRef.current.has(inFlightKey)) {
                return
            }

            inFlightRef.current.add(inFlightKey)
            if (markActive) {
                setLoading(true)
            }

            try {
                const response = await getMTGCardsFilteredQuery({
                    filter: filterArgs,
                    sort: sortArgs,
                    pagination: {
                        ...paginationArgs,
                        page: normalizedPage,
                    },
                })

                if (baseSignatureRef.current !== baseFilterKey) {
                    return
                }

                pageCacheRef.current = {
                    ...pageCacheRef.current,
                    [normalizedPage]: response.pagedCards,
                }

                setPageCache((prev) => ({
                    ...prev,
                    [normalizedPage]: response.pagedCards,
                }))
                setTotalCount(response.totalCount)
            } catch (error) {
                console.error('Failed to fetch MTG cards page', error)
                throw error
            } finally {
                if (markActive) {
                    setLoading(false)
                }
                inFlightRef.current.delete(inFlightKey)
            }
        },
        [baseFilterKey, filterArgs, sortArgs, paginationArgs, getMTGCardsFilteredQuery],
    )

    useEffect(() => {
        const normalizedPage = Math.max(0, activePage)
        if (pageCacheRef.current[normalizedPage]) {
            setLoading(false)
            return
        }

        fetchPage(normalizedPage, { markActive: true }).catch(() => undefined)
    }, [activePage, fetchPage])

    useEffect(() => {
        const currentPageCards = pageCacheRef.current[activePage]
        if (!currentPageCards || totalCount === 0) {
            return
        }

        const totalPages = Math.ceil(totalCount / pageSize)
        for (let offset = 1; offset <= PREFETCH_RADIUS; offset += 1) {
            const prevPage = activePage - offset
            const nextPage = activePage + offset

            if (prevPage >= 0 && !pageCacheRef.current[prevPage]) {
                fetchPage(prevPage).catch(() => undefined)
            }

            if (nextPage < totalPages && !pageCacheRef.current[nextPage]) {
                fetchPage(nextPage).catch(() => undefined)
            }
        }
    }, [activePage, fetchPage, pageSize, totalCount])

    const goToPage = useCallback(
        async (targetPage: number) => {
            let normalizedTarget = Math.max(0, targetPage)
            const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : null
            if (totalPages !== null) {
                normalizedTarget = Math.min(normalizedTarget, Math.max(0, totalPages - 1))
            }

            if (normalizedTarget === activePage) {
                return
            }

            if (!pageCacheRef.current[normalizedTarget]) {
                try {
                    await fetchPage(normalizedTarget, { markActive: true })
                } catch {
                    return
                }

                if (!pageCacheRef.current[normalizedTarget]) {
                    return
                }
            } else {
                setLoading(false)
            }

            setFilter((prev) => ({ ...prev, page: normalizedTarget }))
        },
        [activePage, fetchPage, pageSize, setFilter, totalCount],
    )

    const setRatingForCard = (cardID: string, rating: number) => {
        setPageCache((prevPages) => {
            let updatedPage: number | null = null
            const nextPages: PageCache = { ...prevPages }

            for (const [key, cards] of Object.entries(prevPages)) {
                const pageIndex = Number(key)
                const cardIndex = cards.findIndex((card) => card.ID === cardID)
                if (cardIndex === -1) {
                    continue
                }

                const updatedCards = [...cards]
                updatedCards[cardIndex] = {
                    ...updatedCards[cardIndex],
                    myRating: ratingPayload(rating),
                }
                nextPages[pageIndex] = updatedCards
                updatedPage = pageIndex
                break
            }

            if (updatedPage === null) {
                return prevPages
            }

            return nextPages
        })

        rateMutation({ entityID: cardID, entityType: RatableEntityType.CARD, value: rating })
    }

    const cards = pageCache[activePage] ?? []

    return (
        <MTGCardsContext.Provider value={{ cards, loading, setRatingForCard, totalCount, goToPage }}>
            {children}
        </MTGCardsContext.Provider>
    )
}
