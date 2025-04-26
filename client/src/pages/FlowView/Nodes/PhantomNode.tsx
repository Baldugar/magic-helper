import { NodeProps } from '@xyflow/react'
import { MTG_DeckCard, Position as NodePosition } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

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
    const { data, id } = props
    const { card, onDelete } = data

    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const selectedVersion =
        card.card.versions.find((v) => v.ID === card.selectedVersionID) || card.card.versions.find((v) => v.isDefault)
    if (!selectedVersion) return null

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
                    src={getCorrectCardImage(selectedVersion, card.card.layout, 'normal')}
                    alt={card.card.name}
                    width={100}
                    style={{ opacity: 0.5 }}
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
