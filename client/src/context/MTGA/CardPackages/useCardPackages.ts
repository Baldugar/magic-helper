import { useContext } from 'react'
import { MTGCardPackagesContext } from './CardPackagesContext'

export const useMTGCardPackages = () => useContext(MTGCardPackagesContext)
