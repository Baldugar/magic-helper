import { useContext } from 'react'
import { MTGACardsContext } from './MTGACardsContext'

export const useMTGACards = () => useContext(MTGACardsContext)
