import { Node } from '@xyflow/react'
import { SetStateAction } from 'react'
import { MTG_Card, MTG_Deck, MTG_DeckCard } from '../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes } from './nodeFunctions'

/**
 * Builds a map of card ID -> full MTG_Card from card nodes.
 * Board nodes hold the full card in data.card, so we never depend on the paginated catalogue.
 */
function cardMapFromNodes(nodes: Node[]): Map<string, MTG_Card> {
    const map = new Map<string, MTG_Card>()
    for (const n of nodes) {
        if (n.type === 'cardNode') {
            const data = n.data as { card?: MTG_Card }
            if (data?.card?.ID) map.set(n.id, data.card)
        }
    }
    return map
}

export const calculateNewDeck = (
    deck: MTG_Deck,
    getNodes: () => Node[],
    setDeck: (value: SetStateAction<MTG_Deck>) => void,
) => {
    const nodes = getNodes()
    const cardById = cardMapFromNodes(nodes)
    const newCards = calculateCardsFromNodes(nodes, deck.cards)
        .map((c) => {
            const fullCard = cardById.get(c.card)
            if (!fullCard) return null
            return { ...c, card: fullCard } as MTG_DeckCard
        })
        .filter((c): c is MTG_DeckCard => c != null)
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
