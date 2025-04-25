import { Node } from '@xyflow/react'
import { SetStateAction } from 'react'
import { MTG_Card, MTG_Deck, MTG_DeckCard } from '../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes } from './nodeFunctions'

export const calculateNewDeck = (
    cards: MTG_Card[],
    deck: MTG_Deck | undefined,
    getNodes: () => Node[],
    setDeck: (value: SetStateAction<MTG_Deck | undefined>) => void,
) => {
    if (!deck) return
    const nodes = getNodes()
    const newCards = calculateCardsFromNodes(nodes, deck.cards).map((c) => {
        const card: MTG_DeckCard = {
            ...c,
            card: cards.find((card) => card.ID === c.card)!,
        }
        return card
    })
    const newZones = calculateZonesFromNodes(nodes)
    setDeck({ ...deck, cards: [...newCards], zones: newZones })
}

/**
 * Generates an array of unique random integers from 0 to maxNumber (inclusive).
 *
 * @param maxNumber - The maximum number (inclusive) in the range.
 * @param occurrences - The number of unique integers to return.
 * @returns An array of unique integers. If occurrences exceeds maxNumber + 1, returns all available numbers.
 */
export const getUniqueRandomIntegers = (maxNumber: number, occurrences: number): number[] => {
    // Create an array with all numbers from 0 to maxNumber.
    const numbers: number[] = Array.from({ length: maxNumber + 1 }, (_, i) => i)

    // Shuffle the array using Fisher-Yates shuffle.
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }

    // Return as many numbers as available, up to the requested occurrences.
    return numbers.slice(0, Math.min(occurrences, numbers.length))
}
