import { ReactNode, useEffect, useState } from 'react'
import { MainOrSide, MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType, Position } from '../../../graphql/types'
import { uuidv4 } from '../../../utils/functions/IDFunctions'
import { findNextAvailablePosition } from '../../../utils/functions/nodeFunctions'
import { useMTGDecks } from '../Decks/useMTGDecks'
import { MTGDeckCreatorContext } from './MTGDeckCreatorContext'

export const MTGDeckCreatorProvider = ({ children, deckID }: { children: ReactNode; deckID: string | undefined }) => {
    const { decks } = useMTGDecks()

    const [deck, setDeck] = useState<MTG_Deck>()
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectingCommander, setSelectingCommander] = useState(false)
    const [viewMode, setViewMode] = useState<'catalogue' | 'board' | 'both'>('catalogue')
    const [deckTab, setDeckTab] = useState<MainOrSide>(MainOrSide.MAIN)
    const [openImportDialog, setOpenImportDialog] = useState(false)
    const [openExportDialog, setOpenExportDialog] = useState(false)

    useEffect(() => {
        if (deckID) {
            const foundDeck = decks.find((d) => d.ID === deckID)
            if (foundDeck) {
                setDeck(foundDeck)
            }
        }
    }, [deckID, decks])

    // Add a card to the deck via dragging from the catalogue onto the board
    const onAddCard = (card: MTG_Card, position?: Position, whatDeck?: MTG_Deck): MTG_Deck | undefined => {
        const newDeck = structuredClone(whatDeck ?? deck)
        if (newDeck) {
            if (selectingCommander) {
                // Remove the previous commander
                newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                // Add the new commander
                const cardToReturn = {
                    card,
                    count: 1,
                    deckCardType: MTG_DeckCardType.COMMANDER,
                    mainOrSide: MainOrSide.MAIN,
                    position: position || { x: 0, y: 0 },
                    phantoms: [],
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
                    const cardToReturn: MTG_DeckCard = {
                        card,
                        count: 1,
                        deckCardType: MTG_DeckCardType.NORMAL,
                        mainOrSide: deckTab,
                        position: position || nextAvailableSpot,
                        phantoms: [],
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
                if (deckCard.deckCardType === MTG_DeckCardType.COMPANION) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMPANION)
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
        const isCompanion = deck.cards.find(
            (c) => c.card.ID === card.ID && c.deckCardType === MTG_DeckCardType.COMPANION,
        )
        switch (deckTab) {
            case MainOrSide.MAIN:
                if (isCommander) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                }
                if (isCompanion) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMPANION)
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
            }}
        >
            {children}
        </MTGDeckCreatorContext.Provider>
    )
}
