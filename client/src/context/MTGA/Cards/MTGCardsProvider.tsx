import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, RatableEntityType } from '../../../graphql/types'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const { convertFilters, filter, page, sort } = useMTGFilter()

    const {
        queries: { getMTGCardsFiltered },
        mutations: { rate },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCardsFiltered(convertFilters()).then((cards) => {
            setCards(cards.pagedCards)
            setTotalCount(cards.totalCount)
            setLoading(false)
        })
    }, [getMTGCardsFiltered, convertFilters, filter, page, sort])

    const setRatingForCard = (cardID: string, rating: number) => {
        const newCards = structuredClone(cards)
        const cardIndex = newCards.findIndex((c) => c.ID === cardID)
        if (cardIndex !== -1) {
            newCards[cardIndex].myRating = {
                user: {
                    ID: '1',
                },
                value: rating,
            }
            const myRating = newCards[cardIndex].ratings.find((r) => r.user.ID === '1')
            if (myRating) {
                myRating.value = rating
            } else {
                newCards[cardIndex].ratings.push({
                    user: {
                        ID: '1',
                    },
                    value: rating,
                })
            }
            newCards[cardIndex].aggregatedRating = {
                average:
                    newCards[cardIndex].ratings.reduce((acc, r) => acc + r.value, 0) /
                    newCards[cardIndex].ratings.length,
                count: newCards[cardIndex].ratings.length,
            }
            setCards((prev) => prev.map((c) => (c.ID === cardID ? newCards[cardIndex] : c)))
        }
        rate({ entityID: cardID, entityType: RatableEntityType.CARD, userID: '1', value: rating })
    }

    return (
        <MTGCardsContext.Provider value={{ cards, loading, setRatingForCard, totalCount }}>
            {children}
        </MTGCardsContext.Provider>
    )
}
