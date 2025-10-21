import { ReactNode, useEffect, useState } from 'react'
import { MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType, Position } from '../../../../graphql/types'
import { singleSetSelected } from '../../../../utils/functions/filterFunctions'
import { uuidv4 } from '../../../../utils/functions/IDFunctions'
import { findNextAvailablePosition } from '../../../../utils/functions/nodeFunctions'
import { useMTGFilter } from '../../Filter/useMTGFilter'
import { MTGDeckCreatorLogicContext } from './MTGDeckCreatorLogicContext'

export const MTGDeckCreatorLogicProvider = ({
    children,
    initialDeck,
}: {
    children: ReactNode
    initialDeck: MTG_Deck
}) => {
    const { filter, setFilter } = useMTGFilter()

    const [deck, setDeck] = useState<MTG_Deck>(initialDeck)

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
        const set = singleSetSelected(filter)
        if (filter.isSelectingCommander) {
            // Remove the previous commander
            newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
            // Add the new commander
            const setVersion = card.versions.find((v) => v.ID === selectedVersionID || v.set === set)
            const cardToReturn: MTG_DeckCard = {
                card,
                count: 1,
                deckCardType: MTG_DeckCardType.COMMANDER,
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
            const index = newDeck.cards.findIndex((c) => c.card.ID === ID)
            const nextAvailableSpot = position ?? findNextAvailablePosition(newDeck.cards)
            // If the card is already in the deck, add a phantom
            if (index !== -1) {
                newDeck.cards[index].phantoms.push({ ID: uuidv4(), position: nextAvailableSpot })
            } else {
                const setVersion = card.versions.find((v) => v.ID === selectedVersionID || v.set === set)
                const cardToReturn: MTG_DeckCard = {
                    card,
                    count: 1,
                    deckCardType: MTG_DeckCardType.NORMAL,
                    position: nextAvailableSpot,
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
        const index = newDeck.cards.findIndex((c) => c.card.ID === deckCard.card.ID)
        if (index !== -1) {
            newDeck.cards[index].count++
        }
        setDeck(newDeck)
    }

    const removeOne = (deckCard: MTG_DeckCard) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        const index = newDeck.cards.findIndex((c) => c.card.ID === deckCard.card.ID)
        if (index !== -1) {
            newDeck.cards[index].count--
            if (newDeck.cards[index].count === 0) {
                if (newDeck.cards[index].deckCardType === MTG_DeckCardType.COMMANDER) {
                    newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
                    setFilter((prevFilter) => ({
                        ...prevFilter,
                        page: 0,
                        commander: null,
                    }))
                }
                newDeck.cards.splice(index, 1)
            }
        }
        setDeck(newDeck)
    }

    const removeCard = (card: MTG_Card) => {
        if (!deck) return
        const newDeck = structuredClone(deck)
        const isCommander = deck.cards.find(
            (c) => c.card.ID === card.ID && c.deckCardType === MTG_DeckCardType.COMMANDER,
        )
        const index = newDeck.cards.findIndex((c) => c.card.ID === card.ID)
        if (index !== -1) {
            newDeck.cards.splice(index, 1)
        }
        if (isCommander) {
            newDeck.cards = newDeck.cards.filter((c) => c.deckCardType !== MTG_DeckCardType.COMMANDER)
            setFilter((prevFilter) => ({
                ...prevFilter,
                page: 0,
                commander: null,
            }))
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
        <MTGDeckCreatorLogicContext.Provider
            value={{
                addOne,
                deck,
                setDeck,
                onAddCard,
                removeCard,
                removeOne,
                setCardVersion,
            }}
        >
            {children}
        </MTGDeckCreatorLogicContext.Provider>
    )
}
