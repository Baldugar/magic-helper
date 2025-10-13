import { Flip } from '@mui/icons-material'
import { Box, ButtonBase, styled } from '@mui/material'
import { useEffect, useState } from 'react'
import { MTG_Card, MTG_Layout } from '../../../graphql/types'
import { applyRotate, nextRotate } from '../../../utils/cardRotation'
import { CARD_SIZE_VALUES } from '../../../utils/constants'
import { ImageWithSkeleton } from './ImageWithSkeleton'

export interface FlipCardProps {
    card: MTG_Card
}

const FlipCardContainer = styled(Box)({
    backgroundColor: 'transparent',
    width: CARD_SIZE_VALUES['normal'].width,
    height: CARD_SIZE_VALUES['normal'].height,
    perspective: '1000px',
    transition: 'transform 250ms',
    '&.flipped #flipCard__inner': {
        transform: 'rotateY(180deg)',
    },
})

const FlipCardInner = styled(Box)({
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
})

const FlipCardFace = styled(Box)({
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
})

const FlipCardBack = styled(FlipCardFace)({
    transform: 'rotateY(180deg)',
})

export const FlipCard = (props: FlipCardProps): JSX.Element => {
    const { card } = props

    const [totalRotation, setTotalRotation] = useState<number>(0)

    useEffect(() => {
        document.getElementById('flipCard')!.classList.remove('flipped')
        setTotalRotation(0)
        applyRotate(0, document.getElementById('flipCard'))
    }, [card])

    // Get the default version of the card
    const defaultVersion = card.versions.find((v) => v.isDefault) || card.versions[0]

    const frontFace =
        defaultVersion.cardFaces && defaultVersion.cardFaces.length > 0 && defaultVersion.cardFaces[0].imageUris
            ? defaultVersion.cardFaces[0].imageUris.normal
            : defaultVersion.imageUris
            ? defaultVersion.imageUris.normal
            : null

    const backFace =
        defaultVersion.cardFaces && defaultVersion.cardFaces.length > 1 && defaultVersion.cardFaces[1].imageUris
            ? defaultVersion.cardFaces[1].imageUris.normal
            : null

    const rotatable =
        card.layout === MTG_Layout.adventure || card.layout === MTG_Layout.flip || card.layout === MTG_Layout.split

    return (
        <FlipCardContainer id={'flipCard'}>
            <FlipCardInner id={'flipCard__inner'}>
                <FlipCardFace>
                    {frontFace && (
                        <ImageWithSkeleton
                            width={CARD_SIZE_VALUES['normal'].width}
                            height={CARD_SIZE_VALUES['normal'].height}
                            img={frontFace}
                        />
                    )}
                    {backFace && (
                        <ButtonBase
                            onClick={() => {
                                document.getElementById('flipCard')!.classList.toggle('flipped')
                            }}
                            style={{
                                position: 'absolute',
                                top: 'calc(50% - 20px)',
                                right: '0px',
                            }}
                        >
                            <Box
                                width={'40px'}
                                height={'40px'}
                                bgcolor={'white'}
                                border={'1px solid black'}
                                display={'flex'}
                                justifyContent={'center'}
                                alignItems={'center'}
                            >
                                <Flip />
                            </Box>
                        </ButtonBase>
                    )}
                    {rotatable && (
                        <ButtonBase
                            onClick={() => {
                                const { total } = nextRotate(totalRotation)
                                setTotalRotation(total)
                                applyRotate(total, document.getElementById('flipCard'))
                            }}
                            style={{
                                position: 'absolute',
                                top: 'calc(50% - 20px)',
                                right: '0px',
                            }}
                        >
                            <Box
                                width={'40px'}
                                height={'40px'}
                                bgcolor={'white'}
                                border={'1px solid black'}
                                display={'flex'}
                                justifyContent={'center'}
                                alignItems={'center'}
                            >
                                <Flip />
                            </Box>
                        </ButtonBase>
                    )}
                </FlipCardFace>
                {backFace && (
                    <FlipCardBack>
                        <ImageWithSkeleton
                            width={CARD_SIZE_VALUES['normal'].width}
                            height={CARD_SIZE_VALUES['normal'].height}
                            img={backFace}
                        />
                        <ButtonBase
                            onClick={() => {
                                document.getElementById('flipCard')!.classList.toggle('flipped')
                            }}
                            style={{
                                position: 'absolute',
                                top: 'calc(50% - 20px)',
                                right: '0px',
                            }}
                        >
                            <Box
                                width={'40px'}
                                height={'40px'}
                                bgcolor={'white'}
                                border={'1px solid black'}
                                display={'flex'}
                                justifyContent={'center'}
                                alignItems={'center'}
                            >
                                <Flip />
                            </Box>
                        </ButtonBase>
                    </FlipCardBack>
                )}
            </FlipCardInner>
        </FlipCardContainer>
    )
}
