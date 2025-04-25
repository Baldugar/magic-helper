import { useContext } from 'react'
import { MTGFilterContext } from './MTGFilterContext'

export const useMTGFilter = () => useContext(MTGFilterContext)
