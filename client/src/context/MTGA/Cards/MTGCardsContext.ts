import { createContext } from 'react'
import { MTG_Card } from '../../../graphql/types'

type MTGCardsContextType = {
    cards: Array<MTG_Card>
    totalCount: number
    loading: boolean
    setRatingForCard: (cardID: string, rating: number) => void
    goToPage: (page: number) => Promise<void>
}

export const MTGCardsContext = createContext<MTGCardsContextType>({
    cards: [],
    totalCount: 0,
    loading: true,
    setRatingForCard: () => {},
    goToPage: async () => {},
})
