import { Box, useMediaQuery } from '@mui/material'
import { FC, useMemo, useState } from 'react'
import { useMTGFilter } from '../../../context/MTGA/Filter/useMTGFilter'
import { MTG_Card, MTG_CardVersion, MTG_Image, MTG_Layout } from '../../../graphql/types'
import { CARD_SIZE_VALUES } from '../../../utils/constants'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'
import { getRandomVersionFromFilter } from '../../../utils/functions/filterFunctions'
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
    forceSize?: keyof Omit<MTG_Image, '__typename'>
    forceImage?: keyof Omit<MTG_Image, '__typename'>
    scale?: number
    enableGlow?: boolean
}

/**
 * MTGCardWithHover displays an MTG card image that reveals a large hover preview
 * near the cursor. It supports both card and cardVersion inputs, mobile sizing,
 * and integrates with drag-and-drop when used within the deck creator.
 */
export const MTGCardWithHover: FC<MTGCardWithHoverProps> = (props) => {
    const { data, hideHover, forceSize, forceImage, scale = 1, enableGlow = false } = props
    const { card, type, debugValue } = data
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
    const shouldGlow = enableGlow && !isMobileEffective

    // Select a version based on the current filter's set constraints (if any)
    const randomVersion = useMemo(() => {
        if (type === 'card') {
            return getRandomVersionFromFilter(filter, card)
        }
        return undefined
    }, [card, filter, type])

    const imageSizeFingerprint = forceSize ? forceSize : isMobileEffective ? 'large' : 'small'

    if (type === 'card') {
        const { card } = data
        typeLine = card.typeLine
        if (randomVersion) {
            version = randomVersion
        }
        if (!version) return null
        smallImageUrl = getCorrectCardImage(version, forceImage ?? imageSizeFingerprint)
        if (!smallImageUrl) return null
        largeImageUrl = getCorrectCardImage(version, 'large')
        if (!largeImageUrl) return null
        otherLargeImageUrl = getCorrectCardImage(version, 'large', true)
    } else {
        const { card, cardTypeLine } = data
        typeLine = cardTypeLine
        version = card
        try {
            smallImageUrl = getCorrectCardImage(version, forceImage ?? imageSizeFingerprint)
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

    const hoverScale = smVerticalScreen ? 0.5 : mdVerticalScreen ? 0.6 : 0.7
    const effectiveScale = isMobileEffective ? 1 : Math.max(scale, 0.01)

    const aspectRatio = displayWidth / displayHeight
    const scaledWidth = displayWidth * effectiveScale
    const scaledHeight = displayHeight * effectiveScale

    return (
        <>
            <Box
                display={'flex'}
                flexDirection={'row'}
                position={'relative'}
                width={isMobileEffective ? '100%' : scaledWidth}
                height={isMobileEffective ? 'auto' : scaledHeight}
                sx={{
                    aspectRatio: imageSizeFingerprint === 'large' && isMobileEffective ? aspectRatio : undefined,
                }}
            >
                <ImageWithSkeleton
                    img={smallImageUrl}
                    hover={hover}
                    setHover={setHover}
                    height={scaledHeight}
                    width={scaledWidth}
                    enableGlow={shouldGlow}
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
                    scale={hoverScale}
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
