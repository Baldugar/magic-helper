import { Box, useMediaQuery } from '@mui/material'
import { FC, useMemo, useState } from 'react'
import { useDnD } from '../context/DnD/useDnD'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../context/MTGA/Filter/useMTGFilter'
import { MTG_Card, MTG_CardVersion, MTG_Layout } from '../graphql/types'
import { CARD_SIZE_VALUES } from '../utils/constants'
import { getCorrectCardImage } from '../utils/functions/cardFunctions'
import { getRandomVersionFromFilter } from '../utils/functions/filterFunctions'
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
    let small: string | undefined = undefined
    let large: string | undefined = undefined
    let otherLarge: string | undefined = undefined
    let version: MTG_CardVersion | undefined = undefined
    let typeLine: string | undefined = undefined

    const [hover, setHover] = useState(false)
    const mdVerticalScreen = useMediaQuery('(max-height: 1200px)')
    const smVerticalScreen = useMediaQuery('(max-height: 1000px)')
    const isMobile = useMediaQuery('(max-width: 600px)')

    const randomVersion = useMemo(() => {
        if (type === 'card') {
            return getRandomVersionFromFilter(filter, card)
        }
        return undefined
    }, [type, filter, card])

    if (type === 'card') {
        const { card } = data
        typeLine = card.typeLine
        if (randomVersion) {
            version = randomVersion
        }
        if (!version) return null
        small = getCorrectCardImage(version, isMobile ? 'large' : 'small')
        if (!small) return null
        large = getCorrectCardImage(version, 'large')
        if (!large) return null
        otherLarge = getCorrectCardImage(version, 'large', true)
    } else {
        const { card, cardTypeLine } = data
        typeLine = cardTypeLine
        version = card
        try {
            small = getCorrectCardImage(version, isMobile ? 'large' : 'small')
            if (!small) return null
            large = getCorrectCardImage(version, 'large')
            if (!large) return null
            otherLarge = getCorrectCardImage(version, 'large', true)
        } catch (error) {
            console.error('error', error)
            return <div>Error in version: {version.ID}</div>
        }
    }

    const { height, width } = CARD_SIZE_VALUES['small']

    const scale = smVerticalScreen ? 0.5 : mdVerticalScreen ? 0.6 : 0.7

    const aspectRatio = width / height

    return (
        <>
            <Box
                display={'flex'}
                flexDirection={'row'}
                position={'relative'}
                width={isMobile ? '100%' : width}
                height={isMobile ? 'auto' : height}
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
                sx={{
                    aspectRatio: isMobile ? aspectRatio : undefined,
                }}
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
            {large && hover && !isMobile && (
                <HoverMouseComponent
                    visible={hover && (hideHover === false || hideHover === undefined)}
                    img={large}
                    height={CARD_SIZE_VALUES['large'].height}
                    scale={scale}
                    width={CARD_SIZE_VALUES['large'].width}
                    otherImg={
                        otherLarge !== large || (data.type === 'card' && data.card.layout === MTG_Layout.flip)
                            ? otherLarge
                            : undefined
                    }
                    imgHorizontal={
                        typeLine.startsWith('Battle') ||
                        typeLine.includes('Room') ||
                        (otherLarge === large &&
                            (data.type === 'card'
                                ? !data.card.keywords.includes('Aftermath') && data.card.layout !== MTG_Layout.flip
                                : false))
                    }
                    rotateOther={
                        otherLarge === large && data.type === 'card' && data.card.layout === MTG_Layout.flip
                            ? '180'
                            : '0'
                    }
                />
            )}
        </>
    )
}
