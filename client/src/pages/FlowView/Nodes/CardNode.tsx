import { NodeProps, useReactFlow } from '@xyflow/react'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { MTGA_DeckCard } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'
import { NodeType } from '../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type CardNodeData = {
    card: MTGA_DeckCard
}

export type CardNodeProps = NodeProps & {
    data: CardNodeData
}

export const CardNode = (props: CardNodeProps) => {
    const { data } = props
    const { card } = data

    const { removeCard } = useMTGADeckCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const options: ContextMenuOption[] = [
        {
            label: 'Delete',
            action: () => {
                removeCard(card.card)
                if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(card.card.ID)))
            },
        },
    ]

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <img
                    src={getCorrectCardImage(card.card, 'normal')}
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
