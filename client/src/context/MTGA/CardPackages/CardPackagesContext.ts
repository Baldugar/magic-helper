import { createContext, Dispatch, SetStateAction } from 'react'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'

type MTGCardPackagesContextType = {
    cardPackages: Array<MTG_CardPackage>
    setCardPackages: Dispatch<SetStateAction<Array<MTG_CardPackage>>>
    createCardPackage: (name: string, card?: MTG_Card, mainOrSide?: MainOrSide) => void
    addMTGCardToCardPackage: (cardPackageID: string, card: MTG_Card, mainOrSide: MainOrSide) => void
    removeMTGCardFromCardPackage: (cardPackageID: string, card: MTG_Card) => void
    loading: boolean
}

export const MTGCardPackagesContext = createContext<MTGCardPackagesContextType>({
    cardPackages: [],
    setCardPackages: () => {},
    createCardPackage: () => {},
    addMTGCardToCardPackage: () => {},
    removeMTGCardFromCardPackage: () => {},
    loading: true,
})
