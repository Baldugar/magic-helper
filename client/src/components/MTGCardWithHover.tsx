import { Box } from '@mui/material'
import { FC, useState } from 'react'
import { useDnD } from '../context/DnD/useDnD'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../context/MTGA/Filter/useMTGFilter'
import { MTG_Card } from '../graphql/types'
import { CARD_SIZE_VALUES } from '../utils/constants'
import { getCorrectCardImage } from '../utils/functions/cardFunctions'
import { singleSetSelected } from '../utils/functions/filterFunctions'
import { HoverMouseComponent } from './HoverMouseComponent'
import { ImageWithSkeleton } from './ImageWithSkeleton'

export type MTGACardWithHoverProps = {
    card: MTG_Card
    hideHover?: boolean
    debugValue?: keyof MTG_Card
}

export const MTGACardWithHover: FC<MTGACardWithHoverProps> = (props) => {
    const { card, hideHover, debugValue } = props
    const { viewMode } = useMTGDeckCreator()
    const { onDragStart, onDragEnd } = useDnD()
    const { filter } = useMTGFilter()
    const set = singleSetSelected(filter)

    const [hover, setHover] = useState(false)

    const setVersion = card.versions.find((v) => v.set === set)
    const version = set && setVersion ? setVersion : card.versions.find((v) => v.isDefault)
    if (!version) return null

    const small = getCorrectCardImage(version, card.layout, 'small')

    if (!small) return null

    const large = getCorrectCardImage(version, card.layout, 'large')
    const otherLarge = getCorrectCardImage(version, card.layout, 'large', true)

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
                {debugValue && (
                    <Box position={'absolute'} bottom={0} right={0} bgcolor={'white'}>{`${JSON.stringify(
                        card[debugValue],
                    )}`}</Box>
                )}
            </Box>
            {large && hover && (
                <HoverMouseComponent
                    visible={hover && (hideHover === false || hideHover === undefined)}
                    img={large}
                    height={CARD_SIZE_VALUES['large'].height}
                    scale={0.75}
                    width={CARD_SIZE_VALUES['large'].width}
                    otherImg={otherLarge}
                    imgHorizontal={card.typeLine.startsWith('Battle') || card.typeLine.includes(' Room')}
                />
            )}
        </>
    )
}
