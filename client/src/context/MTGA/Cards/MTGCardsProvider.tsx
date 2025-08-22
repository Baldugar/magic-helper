import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, RatableEntityType } from '../../../graphql/types'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const { convertedFilters } = useMTGFilter()

    const {
        queries: { getMTGCardsFiltered },
        mutations: { rate },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCardsFiltered(convertedFilters).then((cards) => {
            setCards(cards.pagedCards)
            setTotalCount(cards.totalCount)
            setLoading(false)
        })
    }, [getMTGCardsFiltered, convertedFilters])

    const setRatingForCard = (cardID: string, rating: number) => {
        const newCards = structuredClone(cards)
        const cardIndex = newCards.findIndex((c) => c.ID === cardID)
        if (cardIndex !== -1) {
            newCards[cardIndex].myRating = {
                user: {
                    ID: 'USER_ID',
                },
                value: rating,
            }
            setCards((prev) => prev.map((c) => (c.ID === cardID ? newCards[cardIndex] : c)))
        }
        rate({ entityID: cardID, entityType: RatableEntityType.CARD, value: rating })
    }

    return (
        <MTGCardsContext.Provider value={{ cards, loading, setRatingForCard, totalCount }}>
            {children}
        </MTGCardsContext.Provider>
    )
}
