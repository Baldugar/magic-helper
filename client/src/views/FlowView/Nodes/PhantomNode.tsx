import { NodeProps } from '@xyflow/react'
import { MTGA_Card, Position } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'

export type PhantomNodeData = {
    phantomOf: string
    index: number
    position: Position
    card: MTGA_Card
}

export type PhantomNodeProps = NodeProps & {
    data: PhantomNodeData
}

export const PhantomNode = (props: PhantomNodeProps) => {
    const { data } = props
    const { card } = data

    return (
        <div>
            <img src={getCorrectCardImage(card, 'small')} alt={card.name} width={100} style={{ opacity: 0.5 }} />
        </div>
    )
}
