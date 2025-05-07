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
    const gridRef = useRef<HTMLDivElement>(null)
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0)
    const lastScrollTime = useRef<number>(0)
    const lastScrollPosition = useRef<number>(0)

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

    const cardsToShow = filteredCards.slice(page * pageSize, (page + 1) * pageSize)
    const totalPages = Math.ceil(filteredCards.length / pageSize)

    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTop = 0
        }
        setCurrentCardIndex(0)
    }, [page])

    const scrollToCard = (index: number) => {
        if (!gridRef.current) return
        const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
        gridRef.current.scrollTo({
            top: index * cardHeight,
            behavior: 'smooth',
        })
        setCurrentCardIndex(index)
    }

    const handleScroll = () => {
        if (!gridRef.current || !isMobile) return

        const now = Date.now()
        const currentScroll = gridRef.current.scrollTop
        const cardHeight = gridRef.current.scrollHeight / cardsToShow.length
        const currentIndex = Math.round(currentScroll / cardHeight)

        // Calculate scroll speed
        const timeDiff = now - lastScrollTime.current
        const scrollDiff = Math.abs(currentScroll - lastScrollPosition.current)
        const scrollSpeed = scrollDiff / timeDiff

        // If scrolling is fast enough, allow skipping cards
        const maxSkip = scrollSpeed > 0.5 ? 2 : 1

        // Calculate the target index based on the current scroll position and speed
        const scrollDirection = currentIndex > currentCardIndex ? 1 : -1
        const targetIndex = currentCardIndex + scrollDirection * maxSkip

        // Ensure we don't go out of bounds
        const newIndex = Math.max(0, Math.min(cardsToShow.length - 1, targetIndex))

        // Only update if we've moved at least one card
        if (Math.abs(newIndex - currentCardIndex) >= 1) {
            scrollToCard(newIndex)
        }

        lastScrollTime.current = now
        lastScrollPosition.current = currentScroll
    }

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

    return (
        <Grid
            id={'cards-grid'}
            container
            ref={swipeHandlers.ref}
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
