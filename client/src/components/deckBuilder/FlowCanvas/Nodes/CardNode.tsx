import { Node, NodeProps, useReactFlow } from '@xyflow/react'
import { useMTGDeckCreator } from '../../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckFlowCreator } from '../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { MTG_DeckCard, Position } from '../../../../graphql/types'
import { getCorrectCardImage } from '../../../../utils/functions/cardFunctions'
import { uuidv4 } from '../../../../utils/functions/IDFunctions'
import { NodeType } from '../../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../../utils/hooks/ContextMenu/useContextMenu'
import { GroupNodeData } from './GroupNode'
import { PhantomNodeData } from './PhantomNode'

export type CardNodeData = {
    card: MTG_DeckCard
}

export type CardNodeProps = NodeProps & {
    data: CardNodeData
}

export const CardNode = (props: CardNodeProps) => {
    const { data, id, parentId } = props
    const { card } = data
    const { draggingGroupId, onAddCard, handleDeletePhantom } = useMTGDeckFlowCreator()
    const {
        removeCard,
        // deck, setDeck
    } = useMTGDeckCreator()
    const { setNodes, addNodes, getNodes, updateNode } = useReactFlow<NodeType>()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const selectedVersion =
        card.card.versions.find((v) => v.ID === card.selectedVersionID) || card.card.versions.find((v) => v.isDefault)
    if (!selectedVersion) return null

    // Placeholder rendering logic
    if (draggingGroupId && (parentId === draggingGroupId || id === draggingGroupId)) {
        // This is a group node or its child, render placeholder
        return (
            <div
                style={{
                    width: 100,
                    height: 140,
                    background: `url(${getCorrectCardImage(selectedVersion, 'normal')}) no-repeat center center`,
                    backgroundSize: 'contain',
                    borderRadius: 5,
                }}
            />
        )
    }

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                const confirm = window.confirm('Are you sure you want to delete this card?')
                if (!confirm) return
                removeCard(card.card)
                if (setNodes)
                    setNodes((prev) =>
                        // Remove the card node and all phantom nodes that have phantomOf as the card ID
                        prev.filter(
                            (n) =>
                                !n.id.startsWith(card.card.ID) &&
                                (n.type !== 'phantomNode' ||
                                    (n.type === 'phantomNode' &&
                                        (n.data as PhantomNodeData).phantomOf !== card.card.ID)),
                        ),
                    )
            },
        },
        {
            label: 'Create Phantom',
            action: () => {
                const nodes = getNodes()
                const zone = nodes.find(
                    (n) => n.type === 'groupNode' && (n.data as GroupNodeData)?.cardChildren?.includes(card.card.ID),
                )
                const newPosition: Position = {
                    x: (zone?.position.x ?? 0) + card.position.x + 100,
                    y: (zone?.position.y ?? 0) + card.position.y,
                }
                onAddCard(card.card, newPosition)
                addNodes([
                    {
                        data: {
                            card: card,
                            index: card.phantoms.length,
                            onDelete: handleDeletePhantom,
                            phantomOf: card.card.ID,
                            position: newPosition,
                        },
                        id: uuidv4(),
                        position: newPosition,
                        type: 'phantomNode',
                    } as Node<PhantomNodeData>,
                ])
                updateNode(card.card.ID, {
                    data: {
                        card: { ...card, phantoms: [...card.phantoms, newPosition] },
                    } as CardNodeData,
                })
            },
        },
    ]

    // TODO: Add zone movement
    // const zones = calculateZonesFromNodes(getNodes())
    // if (zones.length > 0) {
    //     options.push({
    //         label: 'Move to Zone',
    //         subMenu: zones.map((zone) => ({
    //             label: zone.name,
    //             action: () => {
    //                 const currentZone = zones.find((z) => z.childrenIDs.includes(card.card.ID))
    //                 if (currentZone) {
    //                     updateNode(currentZone.ID, {
    //                         data: {
    //                             childrenIDs: currentZone.childrenIDs.filter((id) => id !== card.card.ID),
    //                         } as GroupNodeData,
    //                     })
    //                 }

    //                 const newPosition = {
    //                     x: card.position.x - zone.position.x,
    //                     y: card.position.y - zone.position.y,
    //                 }

    //                 updateNode(card.card.ID, {
    //                     data: {
    //                         card: { ...card, position: newPosition },
    //                     } as CardNodeData,
    //                 })

    //                 updateNode(zone.ID, {
    //                     data: {
    //                         childrenIDs: zone.childrenIDs ? [...zone.childrenIDs, card.card.ID] : [card.card.ID],
    //                     } as GroupNodeData,
    //                 })

    //                 if (deck) {
    //                     const updatedDeck = {
    //                         ...deck,
    //                         cards: deck.cards.map((deckCard) => {
    //                             if (deckCard.card.ID === card.card.ID) {
    //                                 return {
    //                                     ...deckCard,
    //                                     position: newPosition,
    //                                 }
    //                             }
    //                             return deckCard
    //                         }),
    //                         zones: deck.zones.map((deckZone) => {
    //                             if (deckZone.childrenIDs.includes(card.card.ID)) {
    //                                 return {
    //                                     ...deckZone,
    //                                     childrenIDs: deckZone.childrenIDs.filter((id) => id !== card.card.ID),
    //                                 }
    //                             }
    //                             if (deckZone.ID === zone.ID) {
    //                                 return {
    //                                     ...deckZone,
    //                                     childrenIDs: [...deckZone.childrenIDs, card.card.ID],
    //                                 }
    //                             }
    //                             return deckZone
    //                         }),
    //                     }
    //                     setDeck(updatedDeck)
    //                 }
    //             },
    //         })),
    //     })
    // }

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img
                    src={getCorrectCardImage(selectedVersion, 'normal')}
                    alt={card.card.name}
                    width={100}
                    style={{ borderRadius: 5 }}
                />
            </div>
            <ContextMenu
                anchorRef={anchorRef}
                options={options}
                open={open}
                handleClose={handleClose}
                handleClick={handleClick}
            />
        </>
    )
}
