import { createContext } from 'react'
import { MTG_Card } from '../../../graphql/types'

type MTGCardsContextType = {
    cards: Array<MTG_Card>
    loading: boolean
    setRatingForCard: (cardID: string, rating: number) => void
}

export const MTGCardsContext = createContext<MTGCardsContextType>({
    cards: [],
    loading: true,
    setRatingForCard: () => {},
})
