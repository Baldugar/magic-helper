import { NodeProps, useReactFlow } from '@xyflow/react'
import { useMTGDeckCreatorLogic } from '../../../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGDeckFlowCreator } from '../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { Maybe, MTG_Card } from '../../../../graphql/types'
import { getCorrectCardImage } from '../../../../utils/functions/cardFunctions'
import { NodeType } from '../../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../../utils/hooks/ContextMenu/useContextMenu'
import { PhantomNodeData } from './PhantomNode'

export type CardNodeData = {
    card: MTG_Card
    selectedVersionID: Maybe<string> | undefined
}

export type CardNodeProps = NodeProps & {
    data: CardNodeData
}

export const CardNode = (props: CardNodeProps) => {
    const { data, id, parentId /* positionAbsoluteX, positionAbsoluteY */ } = props
    const { card, selectedVersionID } = data
    const { removeCard } = useMTGDeckCreatorLogic()
    const { draggingZoneIDs } = useMTGDeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const selectedVersion =
        card.versions.find((v) => v.ID === selectedVersionID) || card.versions.find((v) => v.isDefault)

    if (!selectedVersion) return null

    const image = getCorrectCardImage(selectedVersion, 'normal')
    const showContextMenu = !((parentId && draggingZoneIDs.includes(parentId)) || draggingZoneIDs.includes(id))

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                const confirm = window.confirm('Are you sure you want to delete this card?')
                if (!confirm) return
                removeCard(card)
                if (setNodes)
                    setNodes((prev) =>
                        // Remove the card node and all phantom nodes that have phantomOf as the card ID
                        prev.filter(
                            (n) =>
                                !n.id.startsWith(card.ID) &&
                                (n.type !== 'phantomNode' ||
                                    (n.type === 'phantomNode' && (n.data as PhantomNodeData).phantomOf !== card.ID)),
                        ),
                    )
            },
        },
        // {
        //     label: 'Create Phantom',
        //     action: () => {
        //         const nodes = getNodes()
        //         const zone = nodes.find(
        //             (n) => n.type === 'zoneNode' && (n.data as ZoneNodeData)?.cardChildren?.includes(card.ID),
        //         )
        //         const newPosition: Position = {
        //             x: (zone?.position.x ?? 0) + positionAbsoluteX + 100,
        //             y: (zone?.position.y ?? 0) + positionAbsoluteY,
        //         }
        //         onAddCard(card, newPosition)
        //         addNodes([
        //             {
        //                 data: {
        //                     card: card,
        //                     index: card.phantoms.length,
        //                     onDelete: handleDeletePhantom,
        //                     phantomOf: card.ID,
        //                     position: newPosition,
        //                 },
        //                 id: uuidv4(),
        //                 position: newPosition,
        //                 type: 'phantomNode',
        //             } as Node<PhantomNodeData>,
        //         ])
        //         updateNode(card.card.ID, {
        //             data: {
        //                 card: { ...card, phantoms: [...card.phantoms, newPosition] },
        //             } as CardNodeData,
        //         })
        //     },
        // },
    ]

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img src={image} alt={card.name} width={100} style={{ borderRadius: 5 }} />
            </div>
            {showContextMenu && (
                <ContextMenu
                    anchorRef={anchorRef}
                    options={options}
                    open={open}
                    handleClose={handleClose}
                    handleClick={handleClick}
                />
            )}
        </>
    )
}
