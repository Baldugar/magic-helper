import { NodeProps } from '@xyflow/react'
import { MTGA_Card, Position as NodePosition } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'
import { ContextMenu, ContextMenuOption } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type PhantomNodeData = {
    phantomOf: string
    index: number
    position: NodePosition
    card: MTGA_Card
    onDelete: (cardID: string, phantomIndex: number) => void
}

export type PhantomNodeProps = NodeProps & {
    data: PhantomNodeData
}

export const PhantomNode = (props: PhantomNodeProps) => {
    const { data } = props
    const { card, onDelete, phantomOf, index } = data

    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                const respZone = confirm(`Are you sure you want to delete this phantom?`)
                if (respZone) {
                    onDelete(phantomOf, index)
                }
            },
        },
    ]

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img src={getCorrectCardImage(card, 'small')} alt={card.name} width={100} style={{ opacity: 0.5 }} />
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
