import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, RatableEntityType } from '../../../graphql/types'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGCardsContext } from './MTGCardsContext'

/**
 * MTGCardsProvider supplies filtered cards and rating actions to consumers.
 *
 * Behavior
 * - Reacts to converted filters and fetches paginated cards + total count
 * - Exposes setRatingForCard to optimistically update local state and persist via mutation
 */
export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const { convertedFilters } = useMTGFilter()

    const {
        queries: { getMTGCardsFilteredQuery },
        mutations: { rateMutation },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCardsFilteredQuery(convertedFilters).then((cards) => {
            setCards(cards.pagedCards)
            setTotalCount(cards.totalCount)
            setLoading(false)
        })
    }, [getMTGCardsFilteredQuery, convertedFilters])

    /**
     * Optimistically set the rating for a card and persist through GraphQL.
     *
     * @param cardID Target card identifier
     * @param rating Integer rating value
     */
    const setRatingForCard = (cardID: string, rating: number) => {
        const newCards = structuredClone(cards)
        const cardIndex = newCards.findIndex((c) => c.ID === cardID)
        if (cardIndex !== -1) {
            newCards[cardIndex].myRating = {
                user: {
                    ID: 'USER_ID',
                    roles: [],
                },
                value: rating,
            }
            setCards((prev) => prev.map((c) => (c.ID === cardID ? newCards[cardIndex] : c)))
        }
        rateMutation({ entityID: cardID, entityType: RatableEntityType.CARD, value: rating })
    }

    return (
        <MTGCardsContext.Provider value={{ cards, loading, setRatingForCard, totalCount }}>
            {children}
        </MTGCardsContext.Provider>
    )
}
