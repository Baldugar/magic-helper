import { Node } from '@xyflow/react'
import { MTGA_Deck, MTGA_DeckCardInput, Position } from '../../graphql/types'
import { CardNodeData } from './Nodes/CardNode'
import { GroupNodeData } from './Nodes/GroupNode'
import { PhantomNodeData } from './Nodes/PhantomNode'

export const organizeNodes = (deck: MTGA_Deck | undefined): Node[] => {
    const nodes: Node[] = []
    if (!deck) return nodes
    const allPhantoms = deck.cards.flatMap((c) =>
        c.phantoms.map(
            (p, i) =>
                ({
                    card: c.card,
                    phantomOf: c.card.ID,
                    index: i,
                    position: p,
                } as PhantomNodeData),
        ),
    )
    for (const zone of deck.zones) {
        nodes.push({
            id: zone.ID,
            position: zone.position,
            data: {
                label: zone.name,
                childrenIDs: [
                    ...deck.cards.filter((c) => c.position.parentID === zone.ID).map((c) => c.card.ID),
                    ...allPhantoms
                        .filter((p) => p.position.parentID === zone.ID)
                        .map((p) => p.card.ID + '_phantom_' + p.index),
                ],
            },
            type: 'groupNode',
            style: { width: 200, height: 200 },
        } as Node<GroupNodeData>)
    }
    for (const card of deck.cards) {
        nodes.push({
            id: card.card.ID,
            position: card.position,
            data: { label: card.card.name, card: card },
            type: 'cardNode',
        } as Node<CardNodeData>)
    }
    for (const phantom of allPhantoms) {
        nodes.push({
            id: phantom.card.ID + '_phantom_' + phantom.index,
            position: phantom.position,
            data: phantom,
            type: 'phantomNode',
        } as Node<PhantomNodeData>)
    }
    return nodes
}

export const calculateCardsFromNodes = (nodes: Node[]): MTGA_DeckCardInput[] => {
    console.log('nodes', nodes)
    const cards: MTGA_DeckCardInput[] = []
    const cardNodes: Node<CardNodeData>[] = []
    const phantomNodes: Node<PhantomNodeData>[] = []
    for (const node of nodes) {
        if (node.type === 'cardNode') {
            cardNodes.push(node as Node<CardNodeData>)
        }
        if (node.type === 'phantomNode') {
            phantomNodes.push(node as Node<PhantomNodeData>)
        }
    }
    for (const node of cardNodes) {
        const card = node.data.card
        const position = node.position
        const phantoms = phantomNodes
            .filter((p) => p.data.phantomOf === card.card.ID)
            .map(
                (p) =>
                    ({
                        x: p.position.x,
                        y: p.position.y,
                        parentID: p.data.position.parentID,
                    } as Position),
            )
        cards.push({
            card: card.card.ID,
            count: 1,
            position: {
                x: position.x,
                y: position.y,
                parentID: card.position.parentID,
            } as Position,
            phantoms,
            deckCardType: card.deckCardType,
            ID: card.card.ID,
            mainOrSide: card.mainOrSide,
        })
    }
    return cards
}
