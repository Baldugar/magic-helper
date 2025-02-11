import { Node } from '@xyflow/react'
import { SetStateAction } from 'react'
import { MTGA_Card, MTGA_Deck, MTGA_DeckCard } from '../../graphql/types'
import { calculateCardsFromNodes, calculateZonesFromNodes } from './nodeFunctions'

export const calculateNewDeck = (
    cards: MTGA_Card[],
    deck: MTGA_Deck | undefined,
    getNodes: () => Node[],
    setDeck: (value: SetStateAction<MTGA_Deck | undefined>) => void,
) => {
    if (!deck) return
    const nodes = getNodes()
    const newCards = calculateCardsFromNodes(nodes, deck.cards).map((c) => {
        const card: MTGA_DeckCard = {
            ...c,
            card: cards.find((card) => card.ID === c.card)!,
        }
        return card
    })
    const newZones = calculateZonesFromNodes(nodes)
    setDeck({ ...deck, cards: [...newCards], zones: newZones })
}
