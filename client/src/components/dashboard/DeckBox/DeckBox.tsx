import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

interface DeckBoxProps {
    layout: {
        width?: number
        height?: number
        depth?: number
        lidRotation?: number
        hoverLidRotation?: number
        hovered?: boolean
    }
}

const DeckBox = ({
    layout: {
        width = 200, // x-dimension
        height = 100, // y-dimension
        depth = 50, // z-dimension
        lidRotation = 0,
        hoverLidRotation = 10,
        hovered = false,
    },
}: DeckBoxProps) => {
    const halfDepth = depth / 2

    const commonFaceStyle = {
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
    }

    // Compute the current rotations based on the hover state
    const currentTopLidRotation = hovered ? hoverLidRotation : lidRotation
    // For the front face lid, we lift it a bit more on hover.
    const currentFrontLidRotation = hovered ? -80 : -90

    // Define transition durations: slower when hovering in and snappier when exiting.
    const lidTransition = hovered ? 'transform 0.3s ease' : 'transform 0.1s ease'
    // We add a delay on the top lid so that the front lid starts first.
    const topLidDelay = hovered ? '0.1s' : '0s'

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
                    width: width,
                    height: height,
                    backgroundColor: 'rgba(255,0,0,0.3)',
                    transform: `translateZ(${halfDepth}px)`,
                }}
            >
                Front
            </Box>

            {/* Back Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: width,
                    height: height,
                    backgroundColor: 'rgba(0,255,0,0.3)',
                    transform: `rotateY(180deg) translateZ(${halfDepth}px)`,
                    transformOrigin: 'center',
                }}
            >
                Back
            </Box>

            {/* Right Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: depth, // dimensions: depth x height
                    height: height,
                    backgroundColor: 'rgba(0,0,255,0.3)',
                    transform: `rotateY(90deg) translateZ(${width - halfDepth}px)`,
                }}
            >
                Right
            </Box>

            {/* Left Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: depth,
                    height: height,
                    backgroundColor: 'rgba(255,255,0,0.3)',
                    transform: `rotateY(-90deg) translateZ(${halfDepth}px)`,
                }}
            >
                Left
            </Box>

            {/* Top Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: width, // dimensions: width x depth
                    height: depth,
                    backgroundColor: 'rgba(0,255,255,0.3)',
                    transform: `rotateX(90deg) translateZ(${halfDepth}px)`,
                }}
            >
                Top
            </Box>

            {/* Top Face Lid */}
            <Box
                sx={{
                    position: 'absolute',
                    width: width,
                    height: depth,
                    transform: `rotateX(90deg) translateZ(${halfDepth}px)`,
                    transformStyle: 'preserve-3d',
                }}
            >
                <Box
                    sx={{
                        ...commonFaceStyle,
                        position: 'static',
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(130, 214, 217, 0.3)',
                        transformOrigin: 'top center',
                        transform: `rotateX(${currentTopLidRotation}deg)`,
                        transition: `${lidTransition}`,
                        transitionDelay: topLidDelay,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    Top Lid
                    {/* Front Face Lid */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: depth,
                            width: width,
                            height: height,
                            transformOrigin: 'top center',
                            transform: `rotateX(${currentFrontLidRotation}deg)`,
                            transition: `${lidTransition}`,
                        }}
                    >
                        <Box
                            sx={{
                                ...commonFaceStyle,
                                position: 'static',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(130, 214, 217, 0.3)',
                            }}
                        >
                            Top Lid
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Bottom Face */}
            <Box
                sx={{
                    ...commonFaceStyle,
                    width: width,
                    height: depth,
                    backgroundColor: 'rgba(255,0,255,0.3)',
                    transform: `rotateX(-90deg) translateZ(${height - halfDepth}px)`,
                }}
            >
                Bottom
            </Box>
        </Box>
    )
}

// The RotatingDeckBox component wraps the DeckBox with slider controls and now handles the hover state.
// We also add a subtle scale effect on hover to give an extra bit of motion.
const RotatingDeckBox = ({
    width = 100, // x-dimension
    height = 200, // y-dimension
    depth = 50, // z-dimension
}) => {
    const [rotateX, setRotateX] = useState(-30)
    const [rotateY, setRotateY] = useState(-44)
    const [rotateZ, setRotateZ] = useState(0)

    const [lidRotation, setLidRotation] = useState(0)
    // hover state: when true, the lids animate to the "open" position.
    const [hovered, setHovered] = useState(false)

    return (
        <div style={{ textAlign: 'center' }}>
            {/* Perspective Container */}
            <Box
                sx={{
                    width,
                    height,
                    margin: '100px auto',
                    perspective: 1000,
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
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
                        transition: 'transform 0.2s ease-out',
                    }}
                >
                    <DeckBox
                        layout={{
                            width,
                            height,
                            depth,
                            lidRotation,
                            hoverLidRotation: 20,
                            hovered,
                        }}
                    />
                </Box>
            </Box>

            {/* Slider Controls */}
            <Box sx={{ width: 300, margin: 'auto', mt: 4 }}>
                <Typography gutterBottom>Lid Rotation (Default)</Typography>
                <Slider
                    value={lidRotation}
                    onChange={(_, newValue) => setLidRotation(newValue as number)}
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
        </div>
    )
}

export default RotatingDeckBox
