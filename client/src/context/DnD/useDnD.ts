import { useContext } from 'react'
import { DnDContext } from './DnDContext'

export const useDnD = () => useContext(DnDContext)
