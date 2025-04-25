import { useContext } from 'react'
import { MTGDeckCreatorPaginationContext } from './MTGDeckCreatorPaginationContext'

export const useMTGDeckCreatorPagination = () => useContext(MTGDeckCreatorPaginationContext)
