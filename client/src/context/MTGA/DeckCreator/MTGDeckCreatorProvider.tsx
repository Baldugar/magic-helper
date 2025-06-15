import { ReactNode, useEffect, useState } from 'react'
import {
    MainOrSide,
    MTG_Card,
    MTG_CardPackage,
    MTG_Deck,
    MTG_DeckCard,
    MTG_DeckCardType,
    Position,
} from '../../../graphql/types'
import { DeckCreatorView } from '../../../types/deckCreatorView'
import { singleSetSelected } from '../../../utils/functions/filterFunctions'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import { findNextAvailablePosition } from '../../../utils/functions/nodeFunctions'
import { useMTGDecks } from '../Decks/useMTGDecks'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGDeckCreatorContext } from './MTGDeckCreatorContext'

export const MTGDeckCreatorProvider = ({ children, deckID }: { children: ReactNode; deckID: string | undefined }) => {
    const { decks } = useMTGDecks()
    const { filter } = useMTGFilter()
    const set = singleSetSelected(filter)

    const [deck, setDeck] = useState<MTG_Deck>()
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectingCommander, setSelectingCommander] = useState(false)
    const [viewMode, setViewMode] = useState<DeckCreatorView>('CATALOGUE')
    const [deckTab, setDeckTab] = useState<MainOrSide>(MainOrSide.MAIN)
    const [openImportDialog, setOpenImportDialog] = useState(false)
    const [openExportDialog, setOpenExportDialog] = useState(false)
    const [openImportCardPackageDialog, setOpenImportCardPackageDialog] = useState(false)
    // Sticky CardsGrid
    const [stickyCardsGrid, setStickyCardsGrid] = useState(true)

    const [openedCardDialog, setOpenedCardDialog] = useState<string | null>(null)

    useEffect(() => {
        if (deckID) {
            const foundDeck = decks.find((d) => d.ID === deckID)
            if (foundDeck) {
                setDeck(foundDeck)
            }
        }
    }, [deckID, decks])

    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (
        card: MTG_Card,
        position?: Position,
        whatDeck?: MTG_Deck,
        selectedVersionID?: string | null,
    ): MTG_Deck | undefined => {
        const newDeck = structuredClone(whatDeck ?? deck)
        if (newDeck) {
            if (selectingCommander) {
                // Remove the previous commander
                newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                // Add the new commander
                const setVersion = card.versions.find((v) => v.ID === selectedVersionID || v.set === set)
                const cardToReturn: MTG_DeckCard = {
                    card,
                    count: 1,
                    deckCardType: MTG_DeckCardType.COMMANDER,
                    mainOrSide: MainOrSide.MAIN,
                    position: position || { x: 0, y: 0 },
                    phantoms: [],
                    selectedVersionID: setVersion?.ID,
                }
                newDeck.cards.push(cardToReturn)
                setSelectingCommander(false)
            } else {
                const ID = card.ID
                const index = newDeck.cards.findIndex((c) => c.card.ID === ID && c.mainOrSide === deckTab)
                const nextAvailableSpot = findNextAvailablePosition(newDeck.cards)
                // If the card is already in the deck, add a phantom
                if (index !== -1) {
                    newDeck.cards[index].phantoms.push({ ID: uuidv4(), position: position || nextAvailableSpot })
                } else {
                    const setVersion = card.versions.find((v) => v.ID === selectedVersionID || v.set === set)
                    const cardToReturn: MTG_DeckCard = {
                        card,
                        count: 1,
                        deckCardType: MTG_DeckCardType.NORMAL,
                        mainOrSide: deckTab,
                        position: position || nextAvailableSpot,
                        phantoms: [],
                        selectedVersionID: setVersion?.ID,
                    }
                    newDeck.cards.push(cardToReturn)
                }
            }
            if (!whatDeck) setDeck(newDeck)
        }
        return newDeck
    }

    const addOne = (deckCard: MTG_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.mainOrSide) {
            case MainOrSide.MAIN:
                if (deckCard.deckCardType === MTG_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.MAIN,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count++
                    }
                }
                break
            case MainOrSide.SIDEBOARD:
                if (deckCard.deckCardType === MTG_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.SIDEBOARD,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count++
                    }
                }
                break
        }
        setDeck(newDeck)
    }

    const removeOne = (deckCard: MTG_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.mainOrSide) {
            case MainOrSide.MAIN:
                if (deckCard.deckCardType === MTG_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.MAIN,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count--
                        if (newDeck.cards[index].count === 0) {
                            newDeck.cards.splice(index, 1)
                        }
                    }
                }
                if (deckCard.deckCardType === MTG_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                }
                break
            case MainOrSide.SIDEBOARD:
                if (deckCard.deckCardType === MTG_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.SIDEBOARD,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count--
                        if (newDeck.cards[index].count === 0) {
                            newDeck.cards.splice(index, 1)
                        }
                    }
                }
                break
        }
        setDeck(newDeck)
    }

    const removeCard = (card: MTG_Card) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        const isCommander = deck.cards.find(
            (c) => c.card.ID === card.ID && c.deckCardType === MTG_DeckCardType.COMMANDER,
        )
        switch (deckTab) {
            case MainOrSide.MAIN:
                if (isCommander) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                }
                newDeck.cards = newDeck.cards.filter(
                    (c) => !(c.card.ID === card.ID && c.mainOrSide === MainOrSide.MAIN),
                )
                break
            case MainOrSide.SIDEBOARD:
                newDeck.cards = newDeck.cards.filter(
                    (c) => !(c.card.ID === card.ID && c.mainOrSide === MainOrSide.SIDEBOARD),
                )
                break
        }
        setDeck(newDeck)
    }

    const importCardPackage = (cardPackage: MTG_CardPackage) => {
        const newDeck = structuredClone(deck)
        if (!newDeck) return
        for (const card of cardPackage.cards) {
            const index = newDeck.cards.findIndex((c) => c.card.ID === card.card.ID)
            if (index !== -1) {
                newDeck.cards[index].count += card.count
            } else {
                const ID = card.card.ID
                const index = newDeck.cards.findIndex((c) => c.card.ID === ID && c.mainOrSide === deckTab)
                const nextAvailableSpot = findNextAvailablePosition(newDeck.cards)
                // If the card is already in the deck, add a phantom
                if (index !== -1) {
                    newDeck.cards[index].phantoms.push({ ID: uuidv4(), position: nextAvailableSpot })
                } else {
                    const setVersion = card.card.versions.find((v) => v.ID === card.selectedVersionID || v.set === set)
                    const cardToReturn: MTG_DeckCard = {
                        card: card.card,
                        count: 1,
                        deckCardType: MTG_DeckCardType.NORMAL,
                        mainOrSide: deckTab,
                        position: nextAvailableSpot,
                        phantoms: [],
                        selectedVersionID: setVersion?.ID,
                    }
                    newDeck.cards.push(cardToReturn)
                }
            }
        }
        setDeck(newDeck)
    }

    const setCardVersion = (cardID: string, versionID: string) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        const index = newDeck.cards.findIndex((c) => c.card.ID === cardID)
        if (index !== -1) {
            newDeck.cards[index].selectedVersionID = versionID
        }
        setDeck(newDeck)
    }

    return (
        <MTGDeckCreatorContext.Provider
            value={{
                addOne,
                deck,
                setDeck,
                deckTab,
                onAddCard,
                openDrawer,
                removeCard,
                removeOne,
                selectingCommander,
                setDeckTab,
                setOpenDrawer,
                setSelectingCommander,
                setViewMode,
                viewMode,
                openImportDialog,
                setOpenImportDialog,
                openExportDialog,
                setOpenExportDialog,
                openImportCardPackageDialog,
                setOpenImportCardPackageDialog,
                importCardPackage,
                setCardVersion,
                // Sticky CardsGrid
                stickyCardsGrid,
                setStickyCardsGrid,
                // Opened Card Dialog
                openedCardDialog,
                setOpenedCardDialog,
            }}
        >
            {children}
        </MTGDeckCreatorContext.Provider>
    )
}
