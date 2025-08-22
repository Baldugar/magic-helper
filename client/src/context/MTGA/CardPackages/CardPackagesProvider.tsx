import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'
import { MTGCardPackagesContext } from './CardPackagesContext'

export const MTGCardPackagesProvider = ({ children }: { children: ReactNode }) => {
    const [cardPackages, setCardPackages] = useState<Array<MTG_CardPackage>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCardPackages },
        mutations: {
            addMTGCardToCardPackage: addMTGCardToCardPackageMutation,
            removeMTGCardFromCardPackage: removeMTGCardFromCardPackageMutation,
            createMTGCardPackage: createMTGCardPackageMutation,
        },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCardPackages().then((cardPackages) => {
            setCardPackages(cardPackages)
            setLoading(false)
        })
    }, [getMTGCardPackages])

    const addMTGCardToCardPackage = (cardPackageID: string, card: MTG_Card, mainOrSide: MainOrSide) => {
        addMTGCardToCardPackageMutation({
            cardPackageID,
            card: card.ID,
            count: 1,
        }).then((response) => {
            if (response.status) {
                setCardPackages(
                    cardPackages.map((cp) =>
                        cp.ID === cardPackageID
                            ? {
                                  ...cp,
                                  cards: [
                                      ...cp.cards,
                                      {
                                          card: card,
                                          count: 1,
                                          mainOrSide,
                                      },
                                  ],
                              }
                            : cp,
                    ),
                )
            }
        })
    }

    const removeMTGCardFromCardPackage = (cardPackageID: string, card: MTG_Card) => {
        removeMTGCardFromCardPackageMutation({
            cardPackageID,
            card: card.ID,
        }).then((response) => {
            if (response.status) {
                setCardPackages(
                    cardPackages.map((cp) =>
                        cp.ID === cardPackageID
                            ? {
                                  ...cp,
                                  cards: cp.cards.filter((c) => c.card.ID !== card.ID),
                              }
                            : cp,
                    ),
                )
            }
        })
    }

    const createCardPackage = (name: string, card?: MTG_Card, mainOrSide?: MainOrSide) => {
        createMTGCardPackageMutation({ name }).then((response) => {
            if (response.status) {
                setCardPackages([...cardPackages, { cards: [], ID: response.message ?? '', name }])
                if (card) {
                    addMTGCardToCardPackage(response.message ?? '', card, mainOrSide ?? MainOrSide.MAIN)
                }
            }
        })
    }

    return (
        <MTGCardPackagesContext.Provider
            value={{
                cardPackages,
                setCardPackages,
                loading,
                addMTGCardToCardPackage,
                removeMTGCardFromCardPackage,
                createCardPackage,
            }}
        >
            {children}
        </MTGCardPackagesContext.Provider>
    )
}
