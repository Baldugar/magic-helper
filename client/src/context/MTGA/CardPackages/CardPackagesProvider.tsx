import { ReactNode, useCallback, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_Card, MTG_CardPackage } from '../../../graphql/types'
import { MTGCardPackagesContext } from './CardPackagesContext'

export const MTGCardPackagesProvider = ({ children }: { children: ReactNode }) => {
    // Holds card packages used outside of deck context
    const [cardPackages, setCardPackages] = useState<Array<MTG_CardPackage>>([])
    const [publicCardPackages, setPublicCardPackages] = useState<Array<MTG_CardPackage>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCardPackagesQuery },
        mutations: {
            addMTGCardToCardPackageMutation,
            removeMTGCardFromCardPackageMutation,
            createMTGCardPackageMutation,
            deleteMTGCardPackageMutation,
            editMTGCardPackageNameMutation,
            editMTGCardPackageVisibilityMutation,
        },
    } = MTGFunctions

    /**
     * Initial load: fetch all card packages for the user.
     */
    const refreshCardPackages = useCallback(async () => {
        setLoading(true)
        try {
            const [ownPackages, packagesWithPublic] = await Promise.all([
                getMTGCardPackagesQuery(),
                getMTGCardPackagesQuery({ includePublic: true }),
            ])
            setCardPackages(ownPackages)
            setPublicCardPackages(packagesWithPublic.filter((pkg) => pkg.isPublic))
        } finally {
            setLoading(false)
        }
    }, [getMTGCardPackagesQuery])

    useEffect(() => {
        refreshCardPackages()
    }, [refreshCardPackages])

    /**
     * Add a card entry to a package (count=1 by default) and update state.
     *
     * @param cardPackageID Target package
     * @param card MTG card to add
     * @param mainOrSide Whether the card is for main or sideboard context
     */
    const addMTGCardToCardPackage = async (cardPackageID: string, card: MTG_Card, _mainOrSide: MainOrSide) => {
        const response = await addMTGCardToCardPackageMutation({
            cardPackageID,
            card: card.ID,
            count: 1,
        })
        if (response.status) {
            await refreshCardPackages()
        }
    }

    /**
     * Remove a card entry from a card package.
     *
     * @param cardPackageID Target package
     * @param card Card to remove (by ID)
     */
    const removeMTGCardFromCardPackage = async (cardPackageID: string, card: MTG_Card) => {
        const response = await removeMTGCardFromCardPackageMutation({
            cardPackageID,
            card: card.ID,
        })
        if (response.status) {
            await refreshCardPackages()
        }
    }

    /**
     * Create a card package and optionally seed it with a card entry.
     *
     * @param name Package name
     * @param card Optional card to add
     * @param mainOrSide Optional slot side when seeding with a card
     */
    const createCardPackage = async (
        name: string,
        options?: { card?: MTG_Card; mainOrSide?: MainOrSide; isPublic?: boolean },
    ) => {
        const response = await createMTGCardPackageMutation({ name, isPublic: options?.isPublic ?? false })
        if (response.status) {
            if (options?.card && !options?.isPublic) {
                await addMTGCardToCardPackage(response.message ?? '', options.card, options.mainOrSide ?? MainOrSide.MAIN)
            } else {
                await refreshCardPackages()
            }
        }
    }

    /**
     * Delete a card package and remove it from local state.
     *
     * @param cardPackageID Package identifier
     */
    const deleteCardPackage = async (cardPackageID: string) => {
        const response = await deleteMTGCardPackageMutation(cardPackageID)
        if (response.status) {
            await refreshCardPackages()
        }
    }

    /**
     * Rename a card package and update local state.
     *
     * @param cardPackageID Package identifier
     * @param name New name
     */
    const editCardPackageName = async (cardPackageID: string, name: string) => {
        const response = await editMTGCardPackageNameMutation({ cardPackageID, name })
        if (response.status) {
            await refreshCardPackages()
        }
    }

    /**
     * Toggle a card package between private and public visibility.
     */
    const setCardPackageVisibility = async (cardPackageID: string, isPublic: boolean) => {
        const response = await editMTGCardPackageVisibilityMutation({ cardPackageID, isPublic })
        if (response.status) {
            await refreshCardPackages()
        }
    }

    return (
        <MTGCardPackagesContext.Provider
            value={{
                cardPackages,
                publicCardPackages,
                setCardPackages,
                setPublicCardPackages,
                refreshCardPackages,
                loading,
                addMTGCardToCardPackage,
                removeMTGCardFromCardPackage,
                setCardPackageVisibility,
                createCardPackage,
                deleteCardPackage,
                editCardPackageName,
            }}
        >
            {children}
        </MTGCardPackagesContext.Provider>
    )
}
