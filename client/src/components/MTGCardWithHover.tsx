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

export type MTGCardWithHoverProps = {
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
    forceSize?: 'small' | 'large'
}

export const MTGCardWithHover: FC<MTGCardWithHoverProps> = (props) => {
    const { data, hideHover, forceSize } = props
    const { card, type, debugValue } = data
    const { viewMode } = useMTGDeckCreator()
    const { onDragStart, onDragEnd } = useDnD()
    const { filter } = useMTGFilter()
    let smallImageUrl: string | undefined = undefined
    let largeImageUrl: string | undefined = undefined
    let otherLargeImageUrl: string | undefined = undefined
    let version: MTG_CardVersion | undefined = undefined
    let typeLine: string | undefined = undefined

    const [hover, setHover] = useState(false)
    const mdVerticalScreen = useMediaQuery('(max-height: 1200px)')
    const smVerticalScreen = useMediaQuery('(max-height: 1000px)')
    const isMobileQuery = useMediaQuery('(max-width: 600px)')
    const isMobileEffective = !forceSize && isMobileQuery

    const randomVersion = useMemo(() => {
        if (type === 'card') {
            return getRandomVersionFromFilter(filter.sets, card)
        }
        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter.sets])

    const imageSizeFingerprint: 'small' | 'large' = forceSize ? forceSize : isMobileEffective ? 'large' : 'small'

    if (type === 'card') {
        const { card } = data
        typeLine = card.typeLine
        if (randomVersion) {
            version = randomVersion
        }
        if (!version) return null
        smallImageUrl = getCorrectCardImage(version, imageSizeFingerprint)
        if (!smallImageUrl) return null
        largeImageUrl = getCorrectCardImage(version, 'large')
        if (!largeImageUrl) return null
        otherLargeImageUrl = getCorrectCardImage(version, 'large', true)
    } else {
        const { card, cardTypeLine } = data
        typeLine = cardTypeLine
        version = card
        try {
            smallImageUrl = getCorrectCardImage(version, imageSizeFingerprint)
            if (!smallImageUrl) return null
            largeImageUrl = getCorrectCardImage(version, 'large')
            if (!largeImageUrl) return null
            otherLargeImageUrl = getCorrectCardImage(version, 'large', true)
        } catch (error) {
            console.error('error', error)
            return <div>Error in version: {version.ID}</div>
        }
    }

    const { height: displayHeight, width: displayWidth } = CARD_SIZE_VALUES[imageSizeFingerprint]

    const scale = smVerticalScreen ? 0.5 : mdVerticalScreen ? 0.6 : 0.7

    const aspectRatio = displayWidth / displayHeight

    return (
        <>
            <Box
                display={'flex'}
                flexDirection={'row'}
                position={'relative'}
                width={displayWidth}
                height={displayHeight}
                onDragStart={
                    type === 'card'
                        ? (event) => onDragStart(event, 'cardNode', viewMode, { ...card, __typename: 'MTG_Card' })
                        : undefined
                }
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
                    aspectRatio: imageSizeFingerprint === 'large' && isMobileEffective ? aspectRatio : undefined,
                }}
            >
                <ImageWithSkeleton
                    img={smallImageUrl}
                    setHover={setHover}
                    height={displayHeight}
                    width={displayWidth}
                />
                {debugValue && (
                    <Box position={'absolute'} bottom={0} right={0} bgcolor={'white'}>
                        {type === 'card'
                            ? `${JSON.stringify(card[debugValue])}`
                            : `${JSON.stringify(card[debugValue])}`}
                    </Box>
                )}
            </Box>
            {largeImageUrl && hover && !isMobileEffective && (
                <HoverMouseComponent
                    visible={hover && (hideHover === false || hideHover === undefined)}
                    img={largeImageUrl}
                    height={CARD_SIZE_VALUES['large'].height}
                    scale={scale}
                    width={CARD_SIZE_VALUES['large'].width}
                    otherImg={
                        otherLargeImageUrl !== largeImageUrl ||
                        (data.type === 'card' && data.card.layout === MTG_Layout.flip)
                            ? otherLargeImageUrl
                            : undefined
                    }
                    imgHorizontal={
                        typeLine.startsWith('Battle') ||
                        typeLine.includes('Room') ||
                        (otherLargeImageUrl === largeImageUrl &&
                            (data.type === 'card'
                                ? !data.card.keywords.includes('Aftermath') &&
                                  data.card.layout !== MTG_Layout.flip &&
                                  data.card.layout !== MTG_Layout.adventure
                                : false))
                    }
                    rotateOther={
                        otherLargeImageUrl === largeImageUrl &&
                        data.type === 'card' &&
                        data.card.layout === MTG_Layout.flip
                            ? '180'
                            : '0'
                    }
                />
            )}
        </>
    )
}
