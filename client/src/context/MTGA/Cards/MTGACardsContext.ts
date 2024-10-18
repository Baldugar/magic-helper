import { createContext } from 'react'
import { MTGA_Card } from '../../../graphql/types'

type MTGACardsContextType = {
    cards: Array<MTGA_Card>
}

export const MTGACardsContext = createContext<MTGACardsContextType>({ cards: [] })
