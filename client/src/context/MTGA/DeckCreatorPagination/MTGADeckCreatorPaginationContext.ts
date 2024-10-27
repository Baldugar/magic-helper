import { createContext, Dispatch, SetStateAction } from 'react'
import { MTGA_Card } from '../../../graphql/types'

type MTGADeckCreatorPaginationContextType = {
    page: number
    setPage: Dispatch<SetStateAction<number>>
    filteredCards: MTGA_Card[]
}

export const MTGADeckCreatorPaginationContext = createContext<MTGADeckCreatorPaginationContextType>({
    page: 0,
    setPage: () => {},
    filteredCards: [],
})
