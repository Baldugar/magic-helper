import { Box, useMediaQuery } from '@mui/material'
import { FC, useState } from 'react'
import { useDnD } from '../context/DnD/useDnD'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../context/MTGA/Filter/useMTGFilter'
import { MTG_Card, MTG_CardVersion, MTG_Layout } from '../graphql/types'
import { CARD_SIZE_VALUES } from '../utils/constants'
import { getCorrectCardImage } from '../utils/functions/cardFunctions'
import { singleSetSelected } from '../utils/functions/filterFunctions'
import { HoverMouseComponent } from './HoverMouseComponent'
import { ImageWithSkeleton } from './ImageWithSkeleton'

export type MTGACardWithHoverProps = {
    data:
        | {
              type: 'card'
              card: MTG_Card
              debugValue?: keyof MTG_Card
          }
        | {
              type: 'cardVersion'
              card: MTG_CardVersion
              layout: MTG_Layout
              cardTypeLine: string
              debugValue?: keyof MTG_CardVersion
          }
    hideHover?: boolean
}

export const MTGACardWithHover: FC<MTGACardWithHoverProps> = (props) => {
    const { data, hideHover } = props
    const { card, type, debugValue } = data
    const { viewMode } = useMTGDeckCreator()
    const { onDragStart, onDragEnd } = useDnD()
    const { filter } = useMTGFilter()
    const set = singleSetSelected(filter)
    let small: string | undefined = undefined
    let large: string | undefined = undefined
    let otherLarge: string | undefined = undefined
    let version: MTG_CardVersion | undefined = undefined
    let typeLine: string | undefined = undefined

    const [hover, setHover] = useState(false)
    const mdVerticalScreen = useMediaQuery('(max-height: 1200px)')
    const smVerticalScreen = useMediaQuery('(max-height: 1000px)')

    if (type === 'card') {
        const { card } = data
        typeLine = card.typeLine
        version = card.versions.find((v) => v.set === set || v.isDefault)
        if (!version) return null
        small = getCorrectCardImage(version, card.layout, 'small')
        if (!small) return null
        large = getCorrectCardImage(version, card.layout, 'large')
        if (!large) return null
        otherLarge = getCorrectCardImage(version, card.layout, 'large', true)
    } else {
        const { card, layout, cardTypeLine } = data
        typeLine = cardTypeLine
        version = card
        console.log('card', card, layout, cardTypeLine)
        try {
            small = getCorrectCardImage(version, layout, 'small')
            if (!small) return null
            large = getCorrectCardImage(version, layout, 'large')
            if (!large) return null
            otherLarge = getCorrectCardImage(version, layout, 'large', true)
        } catch (error) {
            console.error('error', error)
            return <div>Error in version: {version.ID}</div>
        }
    }

    const { height, width } = CARD_SIZE_VALUES['small']

    const scale = smVerticalScreen ? 0.5 : mdVerticalScreen ? 0.6 : 0.7

    return (
        <>
            <Box
                display={'flex'}
                flexDirection={'row'}
                position={'relative'}
                width={width}
                height={height}
                onDragStart={type === 'card' ? (event) => onDragStart(event, 'cardNode', viewMode, card) : undefined}
                onDragEnd={
                    type === 'card'
                        ? () => {
                              setHover(false)
                              if (onDragEnd) onDragEnd()
                          }
                        : undefined
                }
                draggable
            >
                <ImageWithSkeleton img={small} setHover={setHover} height={height} width={width} />
                {debugValue && (
                    <Box position={'absolute'} bottom={0} right={0} bgcolor={'white'}>
                        {type === 'card'
                            ? `${JSON.stringify(card[debugValue])}`
                            : `${JSON.stringify(card[debugValue])}`}
                    </Box>
                )}
            </Box>
            {large && hover && (
                <HoverMouseComponent
                    visible={hover && (hideHover === false || hideHover === undefined)}
                    img={large}
                    height={CARD_SIZE_VALUES['large'].height}
                    scale={scale}
                    width={CARD_SIZE_VALUES['large'].width}
                    otherImg={otherLarge}
                    imgHorizontal={typeLine.startsWith('Battle') || typeLine.includes(' Room')}
                />
            )}
        </>
    )
}
