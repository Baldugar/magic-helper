import { useContext } from 'react'
import { MTGADeckCreatorPaginationContext } from './MTGADeckCreatorPaginationContext'

export const useMTGADeckCreatorPagination = () => useContext(MTGADeckCreatorPaginationContext)
