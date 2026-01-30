import { Box, Grid, Typography, useMediaQuery } from '@mui/material'
import { isEqual } from 'lodash'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, WheelEvent } from 'react'
import { SwipeEventData, useSwipeable } from 'react-swipeable'
import { CatalogueCard } from '../../../components/deckBuilder/CardTile/CatalogueCard'
import { useMTGCards } from '../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreatorUI } from '../../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { MTG_Image } from '../../../graphql/types'
import { CARD_SIZE_VALUES, PAGE_SIZE_MOBILE } from '../../../utils/constants'

export const CardsGrid = () => {
    const { cards: filteredCards, totalCount, goToPage } = useMTGCards()
    const { filter, originalFilter } = useMTGFilter()
    const gridRef = useRef<HTMLDivElement | null>(null)
    const scrollDebounceTimeout = useRef<NodeJS.Timeout | null>(null)
    const scrollAnimationFrameRef = useRef<number | null>(null)
    const scrollRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [gridSize, setGridSize] = useState({ width: 0, height: 0 })
    const [cardScale, setCardScale] = useState(1)
    const [forceImageSize, setForceImageSize] = useState<keyof Omit<MTG_Image, '__typename'> | undefined>(undefined)
    const { stickyCardsGrid, openDrawer } = useMTGDeckCreatorUI()
    const [lastIgnoredIndex, setLastIgnoredIndex] = useState<number | null>(null)
    const lastPageChangeInteractionRef = useRef<'swipeUp' | 'swipeDown' | 'other'>('other')

    const isMobile = useMediaQuery('(max-width: 600px)')
    useLayoutEffect(() => {
        const node = gridRef.current
        if (!node) {
            return
        }

        if (typeof ResizeObserver === 'undefined') {
            setGridSize({ width: node.clientWidth, height: node.clientHeight })
            return
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                const { width, height } = entry.contentRect
                setGridSize({ width, height })
            }
        })

        observer.observe(node)
        setGridSize({ width: node.clientWidth, height: node.clientHeight })

        return () => observer.disconnect()
    }, [])
    const pageSize = isMobile ? PAGE_SIZE_MOBILE : filter.pageSize
    const shouldFillAvailableSpace = !isMobile && filter.fillAvailableSpace

    const cardsToShow = filteredCards
    const effectiveCardScale = shouldFillAvailableSpace ? cardScale : 1
    const totalPages = Math.ceil(totalCount / pageSize)

    // Spacing in px for MUI Grid (theme.spacing(2)), default is 8px * 2 = 16px
    const spacingPx = 16

    useEffect(() => {
        if (isMobile) {
            setCardScale(1)
            return
        }

        const node = gridRef.current
        if (!node) {
            return
        }

        if (cardsToShow.length === 0) {
            setCardScale(1)
            return
        }

        const style = window.getComputedStyle(node)
        const paddingX = parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0')
        const paddingY = parseFloat(style.paddingTop || '0') + parseFloat(style.paddingBottom || '0')
        const availableWidth = Math.max(gridSize.width - paddingX, 0)
        const availableHeight = Math.max(gridSize.height - paddingY, 0)

        if (availableWidth <= 0 || availableHeight <= 0) {
            setCardScale(1)
            return
        }

        const baseWidth = CARD_SIZE_VALUES.small.width
        const baseHeight = CARD_SIZE_VALUES.small.height
        const cardCount = cardsToShow.length
        let bestScale = 0

        for (let columns = 1; columns <= cardCount; columns += 1) {
            const rows = Math.ceil(cardCount / columns)
            const horizontalSpacing = spacingPx * Math.max(columns - 1, 0)
            const verticalSpacing = spacingPx * Math.max(rows - 1, 0)
            const widthScale = (availableWidth - horizontalSpacing) / (columns * baseWidth)
            if (!Number.isFinite(widthScale) || widthScale <= 0) {
                continue
            }

            const heightNumerator = availableHeight - verticalSpacing
            if (heightNumerator <= 0) {
                continue
            }

            const heightScale = heightNumerator / (rows * baseHeight)
            if (!Number.isFinite(heightScale) || heightScale <= 0) {
                continue
            }

            const candidateScale = Math.min(widthScale, heightScale)

            if (candidateScale > bestScale) {
                bestScale = candidateScale
            }
        }

        if (!Number.isFinite(bestScale) || bestScale <= 0) {
            const widthOnlyScale = availableWidth / baseWidth
            const heightOnlyScale = availableHeight / baseHeight
            const fallbackScale = Math.min(widthOnlyScale, heightOnlyScale)
            bestScale = Math.max(fallbackScale, 0.1)
        }

        const baseCardWidth = CARD_SIZE_VALUES.small.width
        const cardWidth = CARD_SIZE_VALUES.small.width * bestScale
        let bestFittingSize = 'small' as keyof Omit<MTG_Image, '__typename'>
        if (cardWidth <= baseCardWidth) {
            bestFittingSize = 'normal'
        } else if (cardWidth <= CARD_SIZE_VALUES.normal.width) {
            // bestFittingSize = 'normal'
            bestFittingSize = 'PNG'
        } else {
            // bestFittingSize = 'large'
            bestFittingSize = 'PNG'
        }
        requestAnimationFrame(() => {
            setForceImageSize(bestFittingSize)
            setCardScale(bestScale)
        })
    }, [cardsToShow.length, gridSize.height, gridSize.width, shouldFillAvailableSpace, spacingPx, isMobile, openDrawer])

    const handleHorizontalSwipe = (direction: 'left' | 'right') => {
        if (!isMobile) return

        if (direction === 'left' && filter.page < totalPages - 1) {
            lastPageChangeInteractionRef.current = 'other'
            void goToPage(filter.page + 1)
        } else if (direction === 'right' && filter.page > 0) {
            lastPageChangeInteractionRef.current = 'other'
            void goToPage(filter.page - 1)
        }
    }

    const handleVerticalSwipe = (direction: 'up' | 'down') => {
        if (!isMobile || !gridRef.current) {
            return
        }

        const { scrollTop, scrollHeight, clientHeight } = gridRef.current
        const tolerance = 1 // 1 pixel tolerance for scroll position checks

        const atTop = scrollTop <= tolerance
        const atBottom = scrollTop >= scrollHeight - clientHeight - tolerance

        if (direction === 'down' && atBottom && filter.page < totalPages - 1) {
            // Finger swipe UP, go NEXT
            lastPageChangeInteractionRef.current = 'swipeUp'
            void goToPage(filter.page + 1)
        } else if (direction === 'up' && atTop && filter.page > 0) {
            // Finger swipe DOWN, go PREVIOUS
            lastPageChangeInteractionRef.current = 'swipeDown'
            void goToPage(filter.page - 1)
        }
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleHorizontalSwipe('left'),
        onSwipedRight: () => handleHorizontalSwipe('right'),
        onSwiped: (eventData: SwipeEventData) => {
            if (!isMobile) {
                return
            }
            if (eventData.dir === 'Up') {
                handleVerticalSwipe('down')
            } else if (eventData.dir === 'Down') {
                handleVerticalSwipe('up')
            }
        },
        preventScrollOnSwipe: false,
        trackMouse: false,
        delta: 10,
        swipeDuration: 500,
        touchEventOptions: { passive: false },
    })

    const applyScroll = useCallback((scrollAction: () => void) => {
        if (!gridRef.current) return
        scrollAction()
        if (typeof window !== 'undefined') {
            if (scrollAnimationFrameRef.current !== null) {
                window.cancelAnimationFrame(scrollAnimationFrameRef.current)
                scrollAnimationFrameRef.current = null
            }
            scrollAnimationFrameRef.current = window.requestAnimationFrame(() => {
                scrollAction()
                scrollAnimationFrameRef.current = null
            })
        }
        if (scrollRetryTimeoutRef.current) {
            clearTimeout(scrollRetryTimeoutRef.current)
            scrollRetryTimeoutRef.current = null
        }
        scrollRetryTimeoutRef.current = setTimeout(() => {
            scrollAction()
            scrollRetryTimeoutRef.current = null
        }, 160)
    }, [])

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

    useLayoutEffect(() => {
        if (!gridRef.current) {
            return
        }

        const interactionType = lastPageChangeInteractionRef.current
        lastPageChangeInteractionRef.current = 'other'

        const scrollToBottom = () => {
            if (!gridRef.current) {
                return
            }
            if (stickyCardsGrid && cardsToShow.length > 0) {
                scrollToCard(cardsToShow.length - 1)
            } else {
                gridRef.current.scrollTop = gridRef.current.scrollHeight
            }
        }

        const scrollToTop = () => {
            if (!gridRef.current) {
                return
            }
            if (stickyCardsGrid && cardsToShow.length > 0) {
                scrollToCard(0)
            } else {
                gridRef.current.scrollTop = 0
            }
        }

        if (isMobile && interactionType === 'swipeDown') {
            applyScroll(scrollToBottom)
            return
        }

        applyScroll(scrollToTop)
    }, [applyScroll, cardsToShow.length, filter.page, isMobile, scrollToCard, stickyCardsGrid])

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
            if (scrollRetryTimeoutRef.current) {
                clearTimeout(scrollRetryTimeoutRef.current)
                scrollRetryTimeoutRef.current = null
            }
            if (typeof window !== 'undefined' && scrollAnimationFrameRef.current !== null) {
                window.cancelAnimationFrame(scrollAnimationFrameRef.current)
                scrollAnimationFrameRef.current = null
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
                    if (e.deltaY > 0 && filter.page < totalPages - 1) {
                        lastPageChangeInteractionRef.current = 'other'
                        void goToPage(filter.page + 1)
                    }
                    if (e.deltaY < 0 && filter.page > 0) {
                        lastPageChangeInteractionRef.current = 'other'
                        void goToPage(filter.page - 1)
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
                <CatalogueCard
                    card={card}
                    cardScale={effectiveCardScale}
                    key={card.ID}
                    onIgnore={() => setLastIgnoredIndex(idx)}
                    forceImage={forceImageSize}
                />
            ))}
        </Grid>
    )
}
