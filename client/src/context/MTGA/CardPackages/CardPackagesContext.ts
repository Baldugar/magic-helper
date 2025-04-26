import { createContext, Dispatch, SetStateAction } from 'react'
import { MTG_CardPackage } from '../../../graphql/types'

type MTGCardPackagesContextType = {
    cardPackages: Array<MTG_CardPackage>
    setCardPackages: Dispatch<SetStateAction<Array<MTG_CardPackage>>>
    updateCardPackage: (cardPackage: MTG_CardPackage) => void
    loading: boolean
}

export const MTGCardPackagesContext = createContext<MTGCardPackagesContextType>({
    cardPackages: [],
    setCardPackages: () => {},
    updateCardPackage: () => {},
    loading: true,
})
