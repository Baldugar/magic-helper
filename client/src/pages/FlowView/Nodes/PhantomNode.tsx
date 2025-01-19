import { Button, Paper, Stack } from '@mui/material'
import { NodeProps, NodeToolbar, Position } from '@xyflow/react'
import { MTGA_Card, Position as NodePosition } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'

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

    return (
        <>
            <NodeToolbar position={Position.Right}>
                <Paper sx={{ padding: 2 }}>
                    <Stack direction={'column'}>
                        <Button
                            onClick={() => {
                                const respZone = confirm(`Are you sure you want to delete this phantom?`)
                                if (respZone) {
                                    onDelete(phantomOf, index)
                                }
                            }}
                            variant={'contained'}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Paper>
            </NodeToolbar>
            <div>
                <img src={getCorrectCardImage(card, 'small')} alt={card.name} width={100} style={{ opacity: 0.5 }} />
            </div>
        </>
    )
}
