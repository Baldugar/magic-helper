import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'

/**
 * Context shape for MTG Card Packages features.
 */
type MTGCardPackagesContextType = {
    cardPackages: Array<MTG_CardPackage>
    publicCardPackages: Array<MTG_CardPackage>
    setCardPackages: Dispatch<SetStateAction<Array<MTG_CardPackage>>>
    setPublicCardPackages: Dispatch<SetStateAction<Array<MTG_CardPackage>>>
    refreshCardPackages: () => Promise<void>
    createCardPackage: (name: string, options?: { card?: MTG_Card; mainOrSide?: MainOrSide; isPublic?: boolean }) => Promise<void>
    deleteCardPackage: (cardPackageID: string) => Promise<void>
    editCardPackageName: (cardPackageID: string, name: string) => Promise<void>
    addMTGCardToCardPackage: (cardPackageID: string, card: MTG_Card, mainOrSide: MainOrSide) => Promise<void>
    removeMTGCardFromCardPackage: (cardPackageID: string, card: MTG_Card) => Promise<void>
    setCardPackageVisibility: (cardPackageID: string, isPublic: boolean) => Promise<void>
    loading: boolean
}

export const MTGCardPackagesContext = createContext<MTGCardPackagesContextType>({
    cardPackages: [],
    publicCardPackages: [],
    setCardPackages: () => {},
    setPublicCardPackages: () => {},
    refreshCardPackages: async () => {},
    createCardPackage: async () => {},
    deleteCardPackage: async () => {},
    editCardPackageName: async () => {},
    addMTGCardToCardPackage: async () => {},
    removeMTGCardFromCardPackage: async () => {},
    setCardPackageVisibility: async () => {},
    loading: true,
})
