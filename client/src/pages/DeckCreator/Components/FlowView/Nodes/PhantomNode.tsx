import { NodeProps } from '@xyflow/react'
import { useMTGDeckFlowCreator } from '../../../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { MTG_DeckCard, Position as NodePosition } from '../../../../../graphql/types'
import { getCorrectCardImage } from '../../../../../utils/functions/cardFunctions'
import { ContextMenu } from '../../../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../../../utils/hooks/ContextMenu/useContextMenu'

export type PhantomNodeData = {
    phantomOf: string
    position: NodePosition
    card: MTG_DeckCard
    onDelete: (id: string) => void
}

export type PhantomNodeProps = NodeProps & {
    data: PhantomNodeData
}

export const PhantomNode = (props: PhantomNodeProps) => {
    const { data, id, parentId } = props
    const { card, onDelete } = data
    const { draggingGroupId } = useMTGDeckFlowCreator()

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
                    opacity: 0.5,
                }}
            />
        )
    }

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                const respZone = confirm(`Are you sure you want to delete this phantom?`)
                if (respZone) {
                    onDelete(id)
                }
            },
        },
    ]

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img
                    src={getCorrectCardImage(selectedVersion, 'normal')}
                    alt={card.card.name}
                    width={100}
                    style={{ opacity: 0.5, borderRadius: 5 }}
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
