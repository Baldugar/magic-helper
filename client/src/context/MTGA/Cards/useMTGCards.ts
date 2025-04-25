import { useContext } from 'react'
import { MTGCardsContext } from './MTGCardsContext'

export const useMTGCards = () => useContext(MTGCardsContext)
