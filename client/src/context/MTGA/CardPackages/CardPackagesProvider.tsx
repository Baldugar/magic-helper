import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'
import { MTGCardPackagesContext } from './CardPackagesContext'

export const MTGCardPackagesProvider = ({ children }: { children: ReactNode }) => {
    // Holds card packages used outside of deck context
    const [cardPackages, setCardPackages] = useState<Array<MTG_CardPackage>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCardPackagesQuery },
        mutations: {
            addMTGCardToCardPackageMutation,
            removeMTGCardFromCardPackageMutation,
            createMTGCardPackageMutation,
            deleteMTGCardPackageMutation,
            editMTGCardPackageNameMutation,
        },
    } = MTGFunctions

    /**
     * Initial load: fetch all card packages for the user.
     */
    useEffect(() => {
        setLoading(true)
        getMTGCardPackagesQuery().then((cardPackages) => {
            setCardPackages(cardPackages)
            setLoading(false)
        })
    }, [getMTGCardPackagesQuery])

    /**
     * Add a card entry to a package (count=1 by default) and update state.
     *
     * @param cardPackageID Target package
     * @param card MTG card to add
     * @param mainOrSide Whether the card is for main or sideboard context
     */
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
                                          phantoms: [],
                                          position: { x: 0, y: 0 },
                                      },
                                  ],
                              }
                            : cp,
                    ),
                )
            }
        })
    }

    /**
     * Remove a card entry from a card package.
     *
     * @param cardPackageID Target package
     * @param card Card to remove (by ID)
     */
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

    /**
     * Create a card package and optionally seed it with a card entry.
     *
     * @param name Package name
     * @param card Optional card to add
     * @param mainOrSide Optional slot side when seeding with a card
     */
    const createCardPackage = (name: string, card?: MTG_Card, mainOrSide?: MainOrSide) => {
        createMTGCardPackageMutation({ name }).then((response) => {
            if (response.status) {
                // Optimistically add the new package
                setCardPackages([...cardPackages, { cards: [], zones: [], ID: response.message ?? '', name }])
                if (card) {
                    addMTGCardToCardPackage(response.message ?? '', card, mainOrSide ?? MainOrSide.MAIN)
                }
            }
        })
    }

    /**
     * Delete a card package and remove it from local state.
     *
     * @param cardPackageID Package identifier
     */
    const deleteCardPackage = (cardPackageID: string) => {
        deleteMTGCardPackageMutation(cardPackageID).then((response) => {
            if (response.status) {
                setCardPackages(cardPackages.filter((cp) => cp.ID !== cardPackageID))
            }
        })
    }

    /**
     * Rename a card package and update local state.
     *
     * @param cardPackageID Package identifier
     * @param name New name
     */
    const editCardPackageName = (cardPackageID: string, name: string) => {
        editMTGCardPackageNameMutation({ cardPackageID, name }).then((response) => {
            if (response.status) {
                setCardPackages(cardPackages.map((cp) => (cp.ID === cardPackageID ? { ...cp, name } : cp)))
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
                deleteCardPackage,
                editCardPackageName,
            }}
        >
            {children}
        </MTGCardPackagesContext.Provider>
    )
}
