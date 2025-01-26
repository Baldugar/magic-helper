import { ReactNode, useEffect, useState } from 'react'
import { MainOrSide, MTGA_Card, MTGA_Deck, MTGA_DeckCard, MTGA_DeckCardType, Position } from '../../../graphql/types'
import { findNextAvailablePosition } from '../../../utils/functions/nodeFunctions'
import { useMTGADecks } from '../Decks/useMTGADecks'
import { MTGADeckCreatorContext } from './MTGADeckCreatorContext'

export const MTGADeckCreatorProvider = ({ children, deckID }: { children: ReactNode; deckID: string | undefined }) => {
    const { decks } = useMTGADecks()

    const [deck, setDeck] = useState<MTGA_Deck>()
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectingCommander, setSelectingCommander] = useState(false)
    const [viewMode, setViewMode] = useState<'catalogue' | 'board' | 'both'>('catalogue')
    const [deckTab, setDeckTab] = useState<'main' | 'side'>('main')
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
    const onAddCard = (card: MTGA_Card, position?: Position): MTGA_Deck | undefined => {
        const newDeck = structuredClone(deck)
        if (newDeck) {
            if (selectingCommander) {
                // Remove the previous commander
                newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMMANDER)
                // Add the new commander
                const cardToReturn = {
                    card,
                    count: 1,
                    deckCardType: MTGA_DeckCardType.COMMANDER,
                    mainOrSide: MainOrSide.MAIN,
                    position: position || { x: 0, y: 0 },
                    phantoms: [],
                }
                newDeck.cards.push(cardToReturn)
                setSelectingCommander(false)
            } else {
                const mainOrSide = deckTab === 'main' ? MainOrSide.MAIN : MainOrSide.SIDEBOARD
                const ID = card.ID
                const index = newDeck.cards.findIndex((c) => c.card.ID === ID && c.mainOrSide === mainOrSide)
                const nextAvailableSpot = findNextAvailablePosition(newDeck.cards)
                // If the card is already in the deck, add a phantom
                if (index !== -1) {
                    newDeck.cards[index].phantoms.push(position || nextAvailableSpot)
                } else {
                    const cardToReturn = {
                        card,
                        count: 1,
                        deckCardType: MTGA_DeckCardType.NORMAL,
                        mainOrSide,
                        position: position || nextAvailableSpot,
                        phantoms: [],
                    }
                    newDeck.cards.push(cardToReturn)
                }
            }
            setDeck(newDeck)
        }
        return newDeck
    }

    const addOne = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.mainOrSide) {
            case MainOrSide.MAIN:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
                    const index = newDeck.cards.findIndex(
                        (c) => c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.MAIN,
                    )
                    if (index !== -1) {
                        newDeck.cards[index].count++
                    }
                }
                break
            case MainOrSide.SIDEBOARD:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
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

    const removeOne = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.mainOrSide) {
            case MainOrSide.MAIN:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
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
                if (deckCard.deckCardType === MTGA_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMMANDER)
                }
                if (deckCard.deckCardType === MTGA_DeckCardType.COMPANION) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMPANION)
                }
                break
            case MainOrSide.SIDEBOARD:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
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

    const removeCard = (deckCard: MTGA_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        switch (deckCard.mainOrSide) {
            case MainOrSide.MAIN:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
                    newDeck.cards = newDeck.cards.filter(
                        (c) => !(c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.MAIN),
                    )
                }
                if (deckCard.deckCardType === MTGA_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMMANDER)
                }
                if (deckCard.deckCardType === MTGA_DeckCardType.COMPANION) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTGA_DeckCardType.COMPANION)
                }
                break
            case MainOrSide.SIDEBOARD:
                if (deckCard.deckCardType === MTGA_DeckCardType.NORMAL) {
                    newDeck.cards = newDeck.cards.filter(
                        (c) => !(c.card.ID === deckCard.card.ID && c.mainOrSide === MainOrSide.SIDEBOARD),
                    )
                }
                break
        }
        setDeck(newDeck)
    }

    return (
        <MTGADeckCreatorContext.Provider
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
        </MTGADeckCreatorContext.Provider>
    )
}
