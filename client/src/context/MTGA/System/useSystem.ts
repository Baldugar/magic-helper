import { useContext } from 'react'
import { SystemContext } from './SystemContext'

export const useSystem = () => useContext(SystemContext)
