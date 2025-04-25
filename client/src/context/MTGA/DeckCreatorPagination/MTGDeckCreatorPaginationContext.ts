import { createContext, Dispatch, SetStateAction } from 'react'
import { MTG_Card } from '../../../graphql/types'

type MTGDeckCreatorPaginationContextType = {
    page: number
    setPage: Dispatch<SetStateAction<number>>
    filteredCards: MTG_Card[]
}

export const MTGDeckCreatorPaginationContext = createContext<MTGDeckCreatorPaginationContextType>({
    page: 0,
    setPage: () => {},
    filteredCards: [],
})
