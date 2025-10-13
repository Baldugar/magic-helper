import { ReactNode, useEffect, useState } from 'react'
import { MainOrSide, MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType, Position } from '../../../graphql/types'
import { DeckCreatorView } from '../../../types/deckCreatorView'
import { singleSetSelected } from '../../../utils/functions/filterFunctions'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import { findNextAvailablePosition } from '../../../utils/functions/nodeFunctions'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGDeckCreatorContext } from './MTGDeckCreatorContext'

export const MTGDeckCreatorProvider = ({ children, initialDeck }: { children: ReactNode; initialDeck: MTG_Deck }) => {
    const { filter, setFilter } = useMTGFilter()
    const set = singleSetSelected(filter)

    const [deck, setDeck] = useState<MTG_Deck>(initialDeck)
    const [openDrawer, setOpenDrawer] = useState(false)
    const [viewMode, setViewMode] = useState<DeckCreatorView>('CATALOGUE')
    const [deckTab, setDeckTab] = useState<MainOrSide>(MainOrSide.MAIN)
    const [openImportDialog, setOpenImportDialog] = useState(false)
    const [openExportDialog, setOpenExportDialog] = useState(false)
    // Sticky CardsGrid
    const [stickyCardsGrid, setStickyCardsGrid] = useState(true)

    const [openedCardDialog, setOpenedCardDialog] = useState<string | null>(null)

    useEffect(() => {
        if (filter.deckID !== deck.ID) {
            setFilter((prev) => ({
                ...prev,
                deckID: deck.ID,
            }))
        }
        const commander = deck.cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
        if (commander && filter.commander !== commander.card.ID) {
            setFilter((prev) => ({
                ...prev,
                commander: commander.card.ID,
            }))
        } else if (!commander && filter.commander) {
            setFilter((prev) => ({
                ...prev,
                commander: null,
            }))
        }
    }, [deck, setFilter, filter])

    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (card: MTG_Card, position?: Position, selectedVersionID?: string | null): MTG_Deck => {
        const newDeck = structuredClone(deck)
        if (filter.isSelectingCommander) {
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
            setFilter((prevFilter) => ({
                ...prevFilter,
                page: 0,
                commander: card.ID,
                isSelectingCommander: false,
            }))
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
        setDeck(newDeck)
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
                    setFilter((prevFilter) => ({
                        ...prevFilter,
                        page: 0,
                        commander: null,
                    }))
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
                    setFilter((prevFilter) => ({
                        ...prevFilter,
                        page: 0,
                        commander: null,
                    }))
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
                setDeckTab,
                setOpenDrawer,
                setViewMode,
                viewMode,
                openImportDialog,
                setOpenImportDialog,
                openExportDialog,
                setOpenExportDialog,
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
