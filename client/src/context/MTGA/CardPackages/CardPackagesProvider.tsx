import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_CardPackage } from '../../../graphql/types'
import { MTGCardPackagesContext } from './CardPackagesContext'

export const MTGCardPackagesProvider = ({ children }: { children: ReactNode }) => {
    const [cardPackages, setCardPackages] = useState<Array<MTG_CardPackage>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCardPackages },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCardPackages().then((cardPackages) => {
            setCardPackages(cardPackages)
            setLoading(false)
        })
    }, [getMTGCardPackages])

    const updateCardPackage = (cardPackage: MTG_CardPackage) => {
        const index = cardPackages.findIndex((d) => d.ID === cardPackage.ID)
        if (index !== -1) {
            cardPackages[index] = cardPackage
            setCardPackages([...cardPackages])
        } else {
            setCardPackages([...cardPackages, cardPackage])
        }
    }

    return (
        <MTGCardPackagesContext.Provider value={{ cardPackages, setCardPackages, updateCardPackage, loading }}>
            {children}
        </MTGCardPackagesContext.Provider>
    )
}
