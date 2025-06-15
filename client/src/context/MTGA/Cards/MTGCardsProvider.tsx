import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, MTG_Color, RatableEntityType } from '../../../graphql/types'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCards },
        mutations: { rate },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCards().then((cards) => {
            setCards(
                cards.map((c) => ({
                    ...c,
                    colorIdentity: c.colorIdentity.length === 0 ? [MTG_Color.C] : c.colorIdentity,
                })),
            )
            setLoading(false)
        })
    }, [getMTGCards])

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

    return <MTGCardsContext.Provider value={{ cards, loading, setRatingForCard }}>{children}</MTGCardsContext.Provider>
}
