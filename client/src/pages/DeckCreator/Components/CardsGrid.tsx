import { Box, Grid, Typography, useMediaQuery } from '@mui/material'
import { isEqual } from 'lodash'
import { useEffect, useRef, useState, WheelEvent } from 'react'
import { useSwipeable } from 'react-swipeable'
import { useMTGDeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { filter, originalFilter } = useMTGFilter()
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0)
    const lastScrollTime = useRef<number>(0)
    const lastScrollPosition = useRef<number>(0)
    const isScrolling = useRef<boolean>(false)
    const gridRef = useRef<HTMLDivElement | null>(null)
    const scrollTimeout = useRef<NodeJS.Timeout>()

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
        } else if (direction === 'up' && currentCardIndex > 0) {
            scrollToCard(currentCardIndex - 1)
        } else if (direction === 'down' && currentCardIndex < cardsToShow.length - 1) {
            scrollToCard(currentCardIndex + 1)
        }
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleSwipe('left'),
        onSwipedRight: () => handleSwipe('right'),
        onSwipedUp: () => handleSwipe('up'),
        onSwipedDown: () => handleSwipe('down'),
        preventScrollOnSwipe: false,
        trackMouse: false,
        delta: 10,
        swipeDuration: 500,
        touchEventOptions: { passive: false },
    })

    const scrollToCard = (index: number) => {
        if (!gridRef.current || isScrolling.current) return
        isScrolling.current = true

        const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
        const targetScroll = index * cardHeight

        // Clear any existing scroll timeout
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current)
        }

        gridRef.current.scrollTo({
            top: targetScroll,
            behavior: 'smooth',
        })
        setCurrentCardIndex(index)

        // Reset the scrolling flag after the animation completes
        scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false
            if (gridRef.current) {
                gridRef.current.scrollTop = targetScroll // Ensure we're exactly at the target position
            }
        }, 300) // This should match the duration of the smooth scroll
    }

    const handleScroll = () => {
        if (!gridRef.current || !isMobile || isScrolling.current) return

        const now = Date.now()
        const currentScroll = gridRef.current.scrollTop
        const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
        const currentIndex = Math.round(currentScroll / cardHeight)

        // Calculate scroll direction
        const scrollDirection = currentScroll > lastScrollPosition.current ? 1 : -1
        const targetIndex = currentIndex + scrollDirection

        // Only update if we've moved significantly and the target index is valid
        if (
            Math.abs(currentScroll - lastScrollPosition.current) > cardHeight * 0.3 &&
            targetIndex >= 0 &&
            targetIndex < cardsToShow.length
        ) {
            scrollToCard(targetIndex)
        }

        lastScrollTime.current = now
        lastScrollPosition.current = currentScroll
    }

    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTop = 0
        }
        setCurrentCardIndex(0)
    }, [page])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current)
            }
        }
    }, [])

    const setRefs = (element: HTMLDivElement | null) => {
        // Set the grid ref
        gridRef.current = element
        // Set the swipeable ref
        swipeHandlers.ref(element)
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
