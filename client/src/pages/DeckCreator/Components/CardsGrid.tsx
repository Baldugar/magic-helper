import { Box, Grid, Typography, useMediaQuery } from '@mui/material'
import { isEqual } from 'lodash'
import { useCallback, useEffect, useRef, WheelEvent } from 'react'
import { useSwipeable } from 'react-swipeable'
import { useMTGDeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { filter, originalFilter } = useMTGFilter()
    const gridRef = useRef<HTMLDivElement | null>(null)
    const scrollDebounceTimeout = useRef<NodeJS.Timeout | null>(null)

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

    const cardsToShow = filteredCards.slice(page * pageSize, (page + 1) * pageSize)
    const totalPages = Math.ceil(filteredCards.length / pageSize)

    const handleSwipe = (direction: string) => {
        if (!isMobile) return

        if (direction === 'left' && page < totalPages - 1) {
            setPage(page + 1)
        } else if (direction === 'right' && page > 0) {
            setPage(page - 1)
        }
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleSwipe('left'),
        onSwipedRight: () => handleSwipe('right'),
        preventScrollOnSwipe: false,
        trackMouse: false,
        delta: 10,
        swipeDuration: 500,
        touchEventOptions: { passive: false },
    })

    const scrollToCard = useCallback(
        (index: number) => {
            if (!gridRef.current) return
            const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
            const targetScroll = index * cardHeight
            gridRef.current.scrollTop = targetScroll
        },
        [cardsToShow.length],
    )

    const handleScroll = () => {
        if (!gridRef.current || !isMobile) return
        // Debounce scroll event
        if (scrollDebounceTimeout.current) {
            clearTimeout(scrollDebounceTimeout.current)
        }
        scrollDebounceTimeout.current = setTimeout(() => {
            if (!gridRef.current) return
            const currentScroll = gridRef.current.scrollTop
            const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
            // Snap to the nearest card
            const nearestIndex = Math.round(currentScroll / cardHeight)
            scrollToCard(nearestIndex)
        }, 100) // 100ms debounce after scroll ends
    }

    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTop = 0
            scrollToCard(0)
        }
    }, [page, scrollToCard])

    // Cleanup debounce timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollDebounceTimeout.current) {
                clearTimeout(scrollDebounceTimeout.current)
            }
        }
    }, [])

    const setRefs = (element: HTMLDivElement | null) => {
        gridRef.current = element
        if (swipeHandlers.ref) {
            if (typeof swipeHandlers.ref === 'function') {
                swipeHandlers.ref(element)
            } else if (typeof swipeHandlers.ref === 'object' && swipeHandlers.ref !== null) {
                // eslint-disable-next-line no-extra-semi
                ;(swipeHandlers.ref as unknown as React.MutableRefObject<HTMLDivElement | null>).current = element
            }
        }
    }

    return (
        <Grid
            id={'cards-grid'}
            container
            ref={setRefs}
            onScroll={handleScroll}
            onWheel={(e: WheelEvent) => {
                if (!isMobile) {
                    const hasVerticalScrollbar = e.currentTarget.scrollHeight > e.currentTarget.clientHeight
                    if (hasVerticalScrollbar && !e.shiftKey) return
                    if (e.deltaY > 0 && page < totalPages - 1) {
                        setPage(page + 1)
                    }
                    if (e.deltaY < 0 && page > 0) {
                        setPage(page - 1)
                    }
                }
            }}
            {...Object.fromEntries(Object.entries(swipeHandlers).filter(([key]) => key !== 'ref'))}
            sx={{
                overflowY: 'auto',
                flex: 1,
                padding: 2,
                ...(isMobile
                    ? {
                          touchAction: 'pan-y',
                          scrollSnapType: 'y mandatory',
                          '& > *': {
                              scrollSnapAlign: 'start',
                              scrollSnapStop: 'always',
                          },
                      }
                    : {
                          touchAction: 'pan-y',
                      }),
            }}
            spacing={2}
        >
            {cardsToShow.length === 0 && isEqual(filter, originalFilter) && (
                <Box display={'flex'} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'}>
                    <Typography>Loading cards...</Typography>
                </Box>
            )}
            {cardsToShow.length === 0 && !isEqual(filter, originalFilter) && (
                <Box display={'flex'} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'}>
                    <Typography>No cards found with the current filters</Typography>
                </Box>
            )}
            {cardsToShow.map((card) => (
                <CardsGridButton card={card} key={card.ID} />
            ))}
        </Grid>
    )
}
