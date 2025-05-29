import { Box, Grid, Typography, useMediaQuery } from '@mui/material'
import { isEqual } from 'lodash'
import { useCallback, useEffect, useRef, useState, WheelEvent } from 'react'
import { SwipeEventData, useSwipeable } from 'react-swipeable'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckCreatorPagination } from '../../../context/MTGA/DeckCreatorPagination/useMTGDeckCreatorPagination'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../../../utils/constants'
import { CardsGridButton } from './CardsGridButton'

export const CardsGrid = () => {
    const { filteredCards, page, setPage } = useMTGDeckCreatorPagination()
    const { filter, originalFilter } = useMTGFilter()
    const gridRef = useRef<HTMLDivElement | null>(null)
    const scrollDebounceTimeout = useRef<NodeJS.Timeout | null>(null)
    const { stickyCardsGrid } = useMTGDeckCreator()
    const [lastIgnoredIndex, setLastIgnoredIndex] = useState<number | null>(null)
    const lastPageChangeInteractionRef = useRef<'swipeUp' | 'swipeDown' | 'other'>('other')

    const isMobile = useMediaQuery('(max-width: 600px)')
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

    const cardsToShow = filteredCards.slice(page * pageSize, (page + 1) * pageSize)
    const totalPages = Math.ceil(filteredCards.length / pageSize)

    // Spacing in px for MUI Grid (theme.spacing(2)), default is 8px * 2 = 16px
    const spacingPx = 16

    const handleHorizontalSwipe = (direction: 'left' | 'right') => {
        if (!isMobile) return

        if (direction === 'left' && page < totalPages - 1) {
            lastPageChangeInteractionRef.current = 'other'
            setPage(page + 1)
        } else if (direction === 'right' && page > 0) {
            lastPageChangeInteractionRef.current = 'other'
            setPage(page - 1)
        }
    }

    const handleVerticalSwipe = (direction: 'up' | 'down') => {
        console.log('[CardsGrid] handleVerticalSwipe called with direction:', direction)
        if (!isMobile || !gridRef.current) {
            console.log('[CardsGrid] handleVerticalSwipe: Pre-conditions not met', {
                isMobile,
                stickyCardsGrid,
                gridRefCurrent: !!gridRef.current,
            })
            return
        }

        const { scrollTop, scrollHeight, clientHeight } = gridRef.current
        const tolerance = 1 // 1 pixel tolerance for scroll position checks

        const atTop = scrollTop <= tolerance
        const atBottom = scrollTop >= scrollHeight - clientHeight - tolerance

        console.log('[CardsGrid] handleVerticalSwipe: Scroll check', {
            scrollTop,
            scrollHeight,
            clientHeight,
            atTop,
            atBottom,
            page,
            totalPages,
        })

        if (direction === 'down' && atBottom && page < totalPages - 1) {
            // Finger swipe UP, go NEXT
            console.log('[CardsGrid] handleVerticalSwipe: Attempting to go to next page')
            lastPageChangeInteractionRef.current = 'swipeUp'
            setPage(page + 1)
        } else if (direction === 'up' && atTop && page > 0) {
            // Finger swipe DOWN, go PREVIOUS
            console.log('[CardsGrid] handleVerticalSwipe: Attempting to go to previous page')
            lastPageChangeInteractionRef.current = 'swipeDown'
            setPage(page - 1)
        }
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleHorizontalSwipe('left'),
        onSwipedRight: () => handleHorizontalSwipe('right'),
        onSwiped: (eventData: SwipeEventData) => {
            console.log('[CardsGrid] onSwiped event:', eventData)
            if (!isMobile) {
                console.log('[CardsGrid] onSwiped: Not mobile or not sticky, ignoring vertical swipe logic.', {
                    isMobile,
                    stickyCardsGrid,
                })
                return
            }
            if (eventData.dir === 'Up') {
                console.log('[CardsGrid] onSwiped: Detected Finger Swipe UP (intended scroll down/next page)')
                handleVerticalSwipe('down')
            } else if (eventData.dir === 'Down') {
                console.log('[CardsGrid] onSwiped: Detected Finger Swipe DOWN (intended scroll up/previous page)')
                handleVerticalSwipe('up')
            }
        },
        preventScrollOnSwipe: false,
        trackMouse: false,
        delta: 10,
        swipeDuration: 500,
        touchEventOptions: { passive: false },
    })

    const scrollToCard = useCallback(
        (index: number) => {
            if (!gridRef.current) return
            // Account for spacing between cards
            const totalSpacing = (cardsToShow.length - 1) * spacingPx
            const cardHeight = (gridRef.current.scrollHeight - totalSpacing) / cardsToShow.length + spacingPx
            const targetScroll = index * cardHeight
            gridRef.current.scrollTop = targetScroll
        },
        [cardsToShow.length, spacingPx],
    )

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!gridRef.current || !isMobile || !stickyCardsGrid) return
        e.preventDefault()
        e.stopPropagation()

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
        if (!gridRef.current) {
            console.log('[CardsGrid] Page/Interaction Effect: gridRef is null, skipping.')
            return
        }

        const interactionType = lastPageChangeInteractionRef.current
        // Reset the ref immediately for subsequent interactions or unrelated re-renders.
        // This ensures the special scroll logic is only applied once per causal interaction.
        lastPageChangeInteractionRef.current = 'other'

        let scrolledToBottomForSwipeDown = false

        // Condition: User swiped finger DOWN (interactionType === 'swipeDown'),
        // navigating to the PREVIOUS page, on mobile with sticky grid.
        if (isMobile && interactionType === 'swipeDown') {
            if (cardsToShow.length > 0) {
                console.log(
                    `[CardsGrid] Page Change (to P${page}): Caused by FINGER SWIPE DOWN. Mobile sticky. Scrolling to END of new page (card index ${
                        cardsToShow.length - 1
                    }). Interaction: ${interactionType}`,
                )
                setTimeout(() => scrollToCard(cardsToShow.length - 1), 100)
                scrolledToBottomForSwipeDown = true
            } else {
                console.log(
                    `[CardsGrid] Page Change (to P${page}): Caused by FINGER SWIPE DOWN. Mobile sticky. No cards on new page, scrolling to absolute bottom. Interaction: ${interactionType}`,
                )
                setTimeout(() => {
                    if (gridRef.current) {
                        gridRef.current.scrollTop = gridRef.current.scrollHeight
                    }
                }, 100)
                scrolledToBottomForSwipeDown = true
            }
        }

        if (!scrolledToBottomForSwipeDown) {
            // Default behavior: scroll to top for all other page changes or conditions.
            console.log(
                `[CardsGrid] Page Change (to P${page}): Default scroll to TOP. Interaction: ${interactionType}, isMobile: ${isMobile}, sticky: ${stickyCardsGrid}`,
            )
            if (stickyCardsGrid) {
                scrollToCard(0)
            } else {
                gridRef.current.scrollTop = 0
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, scrollToCard, isMobile, stickyCardsGrid, cardsToShow.length]) // Removed lastPageChangeInteraction from dependencies

    // After cardsToShow changes (e.g., after ignore), scroll to the correct card
    useEffect(() => {
        if (isMobile && lastIgnoredIndex !== null && gridRef.current && cardsToShow.length > 0) {
            // If the ignored card was the last one, scroll to the new last card
            const targetIndex = Math.min(lastIgnoredIndex, cardsToShow.length - 1)
            scrollToCard(targetIndex)
            setLastIgnoredIndex(null)
        } else if (!isMobile && lastIgnoredIndex !== null) {
            setLastIgnoredIndex(null)
        }
    }, [cardsToShow, scrollToCard, lastIgnoredIndex, isMobile])

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
                        lastPageChangeInteractionRef.current = 'other'
                        setPage(page + 1)
                    }
                    if (e.deltaY < 0 && page > 0) {
                        lastPageChangeInteractionRef.current = 'other'
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
                    ? stickyCardsGrid
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
            {cardsToShow.map((card, idx) => (
                <CardsGridButton card={card} key={card.ID} onIgnore={() => setLastIgnoredIndex(idx)} />
            ))}
        </Grid>
    )
}
