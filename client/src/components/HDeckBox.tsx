import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import { CSSProperties, useState } from 'react'
import { MTG_Deck } from '../graphql/types'
import { getCorrectCardImage } from '../utils/functions/cardFunctions'
import { getUniqueRandomIntegers } from '../utils/functions/deckFunctions'

interface HDeckBoxProps {
    layout: {
        width?: number
        height?: number
        depth?: number
        lidRotation?: number
        hoverLidRotation?: number
        hovered?: boolean
    }
    deck: MTG_Deck
}

const HDeckBox = ({
    layout: {
        width = 200, // x-dimension
        height = 100, // y-dimension
        depth = 50, // z-dimension
        lidRotation = 0,
        hoverLidRotation = 40,
        hovered = false,
    },
    deck,
}: HDeckBoxProps) => {
    const halfDepth = depth / 2
    const halfHeight = height / 2

    const boxToLidRatio = 0.33
    const boxWidth = width * (1 - boxToLidRatio)
    const lidWidth = width * boxToLidRatio

    const commonFaceStyle: CSSProperties = {
        background: 'url(/texture/box-texture.jpg)', // Mirar si peudo poner el fondo en gris y añadirle color con css
        backgroundSize: 'cover',
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        outline: '2px solid rgba(0,0,0,0.5)',
        outlineOffset: '-2px',
    }

    const [cardIndexes, setCardIndexes] = useState(() => getUniqueRandomIntegers(deck.cards.length - 1, 3))

    const currentRightLidRotation = hovered ? hoverLidRotation : lidRotation
    const rightLidTransition = hovered ? 'transform 0.3s ease' : 'transform 0.3s ease'
    const rightLidDelay = hovered ? '0s' : `${0.2 + 0.2 * cardIndexes.length}s`

    // Define initial and final transform values for the cards
    const card1Initial = `translateX(25px) translateY(20px) translateZ(${-halfDepth + 5}px) rotateZ(0deg)`
    const card1Final = `translateX(${boxWidth - 20}px) translateY(20px) translateZ(${-halfDepth + 5}px) rotateZ(5deg)`

    const card2Initial = `translateX(25px) translateY(20px) translateZ(${-halfDepth + 20}px) rotateZ(0deg)`
    const card2Final = `translateX(${boxWidth - 10}px) translateY(20px) translateZ(${-halfDepth + 20}px) rotateZ(7deg)`

    const card3Initial = `translateX(25px) translateY(20px) translateZ(${-halfDepth + 35}px) rotateZ(0deg)`
    const card3Final = `translateX(${boxWidth - 5}px) translateY(20px) translateZ(${-halfDepth + 35}px) rotateZ(9deg)`

    const card1Delay = hovered ? '0s' : cardIndexes.length > 2 ? '0.4s' : cardIndexes.length > 1 ? '0.2s' : '0s'
    const card2Delay = cardIndexes.length > 2 ? '0.2s' : '0s'
    const card3Delay = hovered ? '0.4s' : '0s'

    const handleLidTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        if (e.propertyName === 'transform' && !hovered) {
            // Recalculate cardIndexes once the lid animation is finished
            setCardIndexes(getUniqueRandomIntegers(deck.cards.length - 1, 3))
        }
    }

    return (
        <Box
            sx={{
                position: 'relative',
                width: width,
                height: height,
                transformStyle: 'preserve-3d',
            }}
        >
            {/* Front Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: boxWidth,
                    height: height,
                    transform: `translateZ(${halfDepth}px)`,
                    overflow: 'hidden',
                }}
            >
                {deck.cardFrontImage && (
                    <img
                        src={deck.cardFrontImage}
                        alt={deck.name}
                        height={'100%'}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            outline: '2px solid rgba(0,0,0,0.5)',
                            outlineOffset: '-2px',
                        }}
                    />
                )}
            </Box>

            {/* Top Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: boxWidth,
                    height: depth,
                    transform: `rotateX(90deg) translateZ(${halfDepth}px)`,
                }}
            />

            {/* Back Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: boxWidth,
                    height: height,
                    transform: `rotateY(180deg) translateZ(${halfDepth}px)`,
                    transformOrigin: 'center',
                    background:
                        commonFaceStyle.background +
                        ` center/cover no-repeat,
                    rgba(0, 0, 0, 0.5)`,
                    backgroundBlendMode: 'multiply',
                }}
            />

            {/* Right Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: depth,
                    height: height,
                    background: 'unset',
                    backgroundColor: 'transparent',
                    transform: `rotateY(90deg) translateZ(${boxWidth - halfDepth}px)`,
                }}
            />

            {/* Left Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: depth,
                    height: height,
                    transform: `rotateY(-90deg) translateZ(${halfDepth}px)`,
                }}
            />

            {/* Bottom Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: boxWidth,
                    height: depth,
                    transform: `rotateX(-90deg) translateZ(${height - halfDepth}px)`,
                    background:
                        commonFaceStyle.background +
                        ` center/cover no-repeat,
                    rgba(0, 0, 0, 0.5)`,
                    backgroundBlendMode: 'multiply',
                }}
            />

            {/* Right Lid */}
            <Box
                sx={{
                    position: 'absolute',
                    width: depth,
                    height: height,
                    transform: `rotateY(90deg) translateZ(${-depth / 2 + boxWidth}px)`,
                    transformStyle: 'preserve-3d',
                }}
            >
                <Box
                    onTransitionEnd={handleLidTransitionEnd}
                    sx={{
                        ...commonFaceStyle,
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transformOrigin: 'right center',
                        transform: `rotateY(${currentRightLidRotation}deg)`,
                        transition: rightLidTransition,
                        transitionDelay: rightLidDelay,
                        transformStyle: 'preserve-3d',
                        background: 'unset',
                    }}
                >
                    <Box
                        sx={{
                            ...commonFaceStyle,
                            position: 'absolute',
                            width: lidWidth,
                            height: '100%',
                            transform: `rotateY(90deg) translateX(-50%) translateZ(${halfDepth}px)`,
                            background:
                                commonFaceStyle.background +
                                ` center/cover no-repeat,
                                    rgba(0, 0, 0, 0.5)`,
                            backgroundBlendMode: 'multiply',
                        }}
                    />
                    <Box
                        sx={{
                            ...commonFaceStyle,
                            position: 'absolute',
                            width: lidWidth,
                            height: '100%',
                            transform: `rotateY(-90deg) translateX(50%) translateZ(${halfDepth}px)`,
                            // overflow: 'hidden',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            background: deck.cardFrontImage
                                ? `url(${deck.cardFrontImage}) center/cover no-repeat`
                                : commonFaceStyle.background,
                            backgroundPosition: 'center right',
                            '&::after': {
                                content: '""',
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                background:
                                    commonFaceStyle.background +
                                    ` center/cover no-repeat,
                                    rgba(0, 0, 0, 0.5)`,
                                backgroundBlendMode: 'multiply',
                                transform: 'scaleX(-1) translateZ(-1px)',
                                outline: '2px solid rgba(0,0,0)',
                                outlineOffset: '-2px',
                            },
                        }}
                    />
                    {/* RIGHT / OUTER */}
                    <Box
                        sx={{
                            ...commonFaceStyle,
                            position: 'absolute',
                            width: lidWidth,
                            height: height,
                            transform: `translateZ(${lidWidth}px)`,
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            background: commonFaceStyle.background,
                            backgroundPosition: 'center right',
                            '&::after': {
                                content: '""',
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                background:
                                    commonFaceStyle.background +
                                    ` center/cover no-repeat,
                                    rgba(0, 0, 0, 0.5)`,
                                backgroundBlendMode: 'multiply',
                                transform: 'scaleX(-1) translateZ(-1px)',
                                outline: '2px solid black',
                                outlineOffset: '-4px',
                            },
                        }}
                    />
                    {/* TOP */}
                    <Box
                        sx={{
                            ...commonFaceStyle,
                            position: 'absolute',
                            width: depth,
                            height: lidWidth,
                            transform: `rotateX(90deg) translateZ(${halfHeight}px) translateY(${lidWidth / 2}px)`,
                        }}
                    />
                    {/* BOTTOM */}
                    <Box
                        sx={{
                            ...commonFaceStyle,
                            position: 'absolute',
                            width: depth,
                            height: lidWidth,
                            transform: `rotateX(90deg) translateZ(${-halfHeight}px) translateY(${lidWidth / 2}px)`,
                            transformStyle: 'preserve-3d',
                            background:
                                commonFaceStyle.background +
                                ` center/cover no-repeat,
                    rgba(0, 0, 0, 0.5)`,
                            backgroundBlendMode: 'multiply',
                        }}
                    />
                </Box>
            </Box>

            {/* Card 1 */}
            {cardIndexes.length > 0 && (
                <Box
                    sx={{
                        ...commonFaceStyle,
                        width: width - 50,
                        height: height - 20,
                        transform: hovered ? card1Final : card1Initial,
                        transition: 'transform 0.5s ease',
                        transitionDelay: card1Delay,
                        borderRadius: 4,
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={getCorrectCardImage(deck.cards[cardIndexes[0]].card, 'artCrop')}
                        alt={deck.cards[cardIndexes[0]].card.name}
                        width={'100%'}
                        height={'100%'}
                        style={{ borderRadius: 5 }}
                    />
                </Box>
            )}

            {/* Card 2 */}
            {cardIndexes.length > 1 && (
                <Box
                    sx={{
                        ...commonFaceStyle,
                        width: width - 50,
                        height: height - 20,
                        transform: hovered ? card2Final : card2Initial,
                        transition: 'transform 0.75s ease',
                        transitionDelay: card2Delay,
                        borderRadius: 4,
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={getCorrectCardImage(deck.cards[cardIndexes[1]].card, 'artCrop')}
                        alt={deck.cards[cardIndexes[1]].card.name}
                        width={'100%'}
                        height={'100%'}
                        style={{ borderRadius: 5 }}
                    />
                </Box>
            )}

            {/* Card 3 */}
            {cardIndexes.length > 2 && (
                <Box
                    sx={{
                        ...commonFaceStyle,
                        width: width - 50,
                        height: height - 20,
                        transform: hovered ? card3Final : card3Initial,
                        transition: 'transform 1s ease',
                        transitionDelay: card3Delay,
                        borderRadius: 4,
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={getCorrectCardImage(deck.cards[cardIndexes[2]].card, 'artCrop')}
                        alt={deck.cards[cardIndexes[2]].card.name}
                        width={'100%'}
                        height={'100%'}
                        style={{ borderRadius: 5 }}
                    />
                </Box>
            )}
        </Box>
    )
}

// The RotatingHDeckBox component now includes panning (drag-to-rotate) support.
// You can still use the sliders to adjust rotation values manually.
const RotatingHDeckBox = ({
    debug = false,
    deck,
    onClick,
}: {
    debug?: boolean
    deck: MTG_Deck
    onClick: (deck: MTG_Deck) => void
}) => {
    const width = 313
    const height = 228.5
    const depth = 100
    const [rotateX, setRotateX] = useState(-18.5)
    const [rotateY, setRotateY] = useState(-14.5)
    const [rotateZ, setRotateZ] = useState(0)

    const [lidRotation, setLidRotation] = useState(0)
    const [hovered, setHovered] = useState(false)
    const [hoverLidRotation, setHoverLidRotation] = useState(120)

    // State for panning
    const [isDragging, setIsDragging] = useState(false)
    const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null)

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!debug) return
        setIsDragging(true)
        setLastMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !lastMousePos || !debug) return
        const dx = e.clientX - lastMousePos.x
        const dy = e.clientY - lastMousePos.y
        // Adjust sensitivity as needed
        const sensitivity = 0.5
        setRotateY((prev) => prev + dx * sensitivity)
        setRotateX((prev) => prev - dy * sensitivity)
        setLastMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUpOrLeave = () => {
        if (!debug) return
        setIsDragging(false)
        setLastMousePos(null)
    }

    return (
        <div style={{ textAlign: 'center' }}>
            {/* Perspective Container */}
            <Box
                sx={{
                    width,
                    height,
                    margin: '100px auto',
                    perspective: 1000,
                    zIndex: hovered ? 999 : 0,
                    position: 'relative',
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => {
                    setHovered(false)
                    handleMouseUpOrLeave()
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
            >
                {/* Rotation Container with a slight scale effect on hover */}
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        transformStyle: 'preserve-3d',
                        transform: `${
                            hovered ? 'scale(1.02)' : 'scale(1)'
                        } rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        cursor: debug ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    }}
                    onClick={() => onClick(deck)}
                >
                    <HDeckBox
                        layout={{
                            width,
                            height,
                            depth,
                            lidRotation,
                            hoverLidRotation,
                            hovered,
                        }}
                        deck={deck}
                    />
                </Box>
            </Box>

            {debug && (
                <Box sx={{ width: 300, margin: 'auto', mt: 4 }}>
                    <Typography gutterBottom>Lid Rotation (Default)</Typography>
                    <Slider
                        value={lidRotation}
                        onChange={(_, newValue) => setLidRotation(newValue as number)}
                        min={-360}
                        max={360}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>Lid Rotation (Hovered)</Typography>
                    <Slider
                        value={hoverLidRotation}
                        onChange={(_, newValue) => setHoverLidRotation(newValue as number)}
                        min={-360}
                        max={360}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>Rotate X</Typography>
                    <Slider
                        value={rotateX}
                        onChange={(_, newValue) => setRotateX(newValue as number)}
                        min={-180}
                        max={180}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>Rotate Y</Typography>
                    <Slider
                        value={rotateY}
                        onChange={(_, newValue) => setRotateY(newValue as number)}
                        min={-180}
                        max={180}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>Rotate Z</Typography>
                    <Slider
                        value={rotateZ}
                        onChange={(_, newValue) => setRotateZ(newValue as number)}
                        min={-180}
                        max={180}
                        valueLabelDisplay="auto"
                    />
                </Box>
            )}
        </div>
    )
}

export default RotatingHDeckBox
