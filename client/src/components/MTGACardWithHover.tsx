import { Box } from '@mui/material'
import { FC, useState } from 'react'
import { useDnD } from '../context/DnD/useDnD'
import { useMTGADeckCreator } from '../context/MTGA/DeckCreator/useMTGADeckCreator'
import { MTGA_Card } from '../graphql/types'
import { CARD_SIZE_VALUES } from '../utils/constants'
import { getCorrectCardImage } from '../utils/functions/cardFunctions'
import { HoverMouseComponent } from './HoverMouseComponent'
import { ImageWithSkeleton } from './ImageWithSkeleton'

export type MTGACardWithHoverProps = {
    card: MTGA_Card
    hideHover?: boolean
}

export const MTGACardWithHover: FC<MTGACardWithHoverProps> = (props) => {
    const { card, hideHover } = props
    const { viewMode } = useMTGADeckCreator()
    const { onDragStart, onDragEnd } = useDnD()

    const [hover, setHover] = useState(false)

    const small = getCorrectCardImage(card, 'small')

    if (!small) return null

    const normal = getCorrectCardImage(card, 'normal')
    const otherNormal = getCorrectCardImage(card, 'normal', true)

    const { height, width } = CARD_SIZE_VALUES['small']

    return (
        <>
            <Box
                display={'flex'}
                flexDirection={'row'}
                position={'relative'}
                width={width}
                height={height}
                onDragStart={(event) => onDragStart(event, 'cardNode', viewMode, card)}
                onDragEnd={() => {
                    setHover(false)
                    if (onDragEnd) onDragEnd()
                }}
                draggable
            >
                <ImageWithSkeleton img={small} setHover={setHover} height={height} width={width} />
            </Box>
            {normal && hover && (
                <HoverMouseComponent
                    visible={hover && (hideHover === false || hideHover === undefined)}
                    img={normal}
                    height={CARD_SIZE_VALUES['normal'].height}
                    scale={0.75}
                    width={CARD_SIZE_VALUES['normal'].width}
                    otherImg={otherNormal}
                />
            )}
        </>
    )
}
