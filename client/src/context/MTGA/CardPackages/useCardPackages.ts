import { useContext } from 'react'
import { MTGCardPackagesContext } from './CardPackagesContext'

/**
 * useMTGCardPackages exposes card package state and actions (create, edit, add/remove).
 *
 * Usage:
 * ```tsx
 * const { cardPackages, createCardPackage, editCardPackageName } = useMTGCardPackages();
 * ```
 *
 * Must be used under <MTGCardPackagesProvider />.
 */
export const useMTGCardPackages = () => useContext(MTGCardPackagesContext)
