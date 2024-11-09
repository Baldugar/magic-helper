import { NodeProps } from '@xyflow/react'
import { MTGA_DeckCard } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'

export type CardNodeData = {
    card: MTGA_DeckCard
}

export type CardNodeProps = NodeProps & {
    data: CardNodeData
}

export const CardNode = (props: CardNodeProps) => {
    const { data } = props
    const { card } = data

    return (
        <div>
            <img
                src={getCorrectCardImage(card.card, 'normal')}
                alt={card.card.name}
                width={100}
                style={{ borderRadius: 5 }}
            />
        </div>
    )
}
