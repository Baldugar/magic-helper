import { NodeProps } from '@xyflow/react'
import { MTGA_Card } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'

export type CardNodeProps = NodeProps & {
    data: {
        card: MTGA_Card
    }
}

export const CardNode = (props: CardNodeProps) => {
    const { data } = props
    const { card } = data

    return (
        <div>
            <img src={getCorrectCardImage(card, 'small')} alt={card.name} width={100} />
        </div>
    )
}
