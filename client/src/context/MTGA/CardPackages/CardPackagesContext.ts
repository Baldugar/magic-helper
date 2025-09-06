import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'

/**
 * Context shape for MTG Card Packages features.
 */
type MTGCardPackagesContextType = {
    cardPackages: Array<MTG_CardPackage>
    setCardPackages: Dispatch<SetStateAction<Array<MTG_CardPackage>>>
    createCardPackage: (name: string, card?: MTG_Card, mainOrSide?: MainOrSide) => void
    deleteCardPackage: (cardPackageID: string) => void
    editCardPackageName: (cardPackageID: string, name: string) => void
    addMTGCardToCardPackage: (cardPackageID: string, card: MTG_Card, mainOrSide: MainOrSide) => void
    removeMTGCardFromCardPackage: (cardPackageID: string, card: MTG_Card) => void
    loading: boolean
}

export const MTGCardPackagesContext = createContext<MTGCardPackagesContextType>({
    cardPackages: [],
    setCardPackages: () => {},
    createCardPackage: () => {},
    deleteCardPackage: () => {},
    editCardPackageName: () => {},
    addMTGCardToCardPackage: () => {},
    removeMTGCardFromCardPackage: () => {},
    loading: true,
})
