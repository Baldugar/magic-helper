import { Box, Portal } from '@mui/material'
import { FC, useCallback, useEffect, useState } from 'react'

export type HoverMouseComponentProps = {
    visible: boolean
    img: string
    otherImg?: string
    width: number
    height: number
    scale: number
    imgHorizontal?: boolean
    rotateOther?: '180' | '0'
}

export const HoverMouseComponent: FC<HoverMouseComponentProps> = (props) => {
    const { height, img, imgHorizontal, scale: zoomScale, visible, width, otherImg, rotateOther } = props
    const offset = 20
    const edgeOffset = 10

    const [x, setX] = useState(0)
    const [y, setY] = useState(0)

    const [transformations, setTransformations] = useState<{
        xMod: number
        yMod: number
        transformOrigin: string
        scale: number
    }>({
        scale: zoomScale,
        transformOrigin: 'top left',
        xMod: offset,
        yMod: offset,
    })

    const { xMod, yMod, transformOrigin, scale } = transformations

    const effectiveWidth = imgHorizontal ? height : width
    const totalWidth = (effectiveWidth + (otherImg ? width : 0)) * zoomScale
    const totalHeight = height * zoomScale

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (visible) {
                const calculatedCloseToEdge: {
                    bottom: boolean
                    right: boolean
                } = {
                    bottom: false,
                    right: false,
                }
                const viewPort = window.visualViewport
                if (!viewPort) {
                    console.error('NO VIEWPORT')
                    return
                }
                const newTransformations = { ...transformations }

                // Check if the mouse is close to the right edge of the viewport
                if (viewPort.width - totalWidth < e.clientX + offset + edgeOffset) {
                    calculatedCloseToEdge.right = true
                } else {
                    calculatedCloseToEdge.right = false
                }

                // Check if the mouse is close to the bottom edge of the viewport
                if (viewPort.height - totalHeight < e.clientY + offset + edgeOffset) {
                    calculatedCloseToEdge.bottom = true
                } else {
                    calculatedCloseToEdge.bottom = false
                }

                // Calculate the necessary transformations based on the mouse position
                if (calculatedCloseToEdge.bottom && calculatedCloseToEdge.right) {
                    const yToEdge = viewPort.height - e.clientY
                    const xMod = -(totalWidth + offset)
                    const yMod = yToEdge - totalHeight - offset
                    newTransformations.xMod = xMod
                    newTransformations.yMod = yMod
                } else if (calculatedCloseToEdge.right) {
                    const xToEdge = viewPort.width - e.clientX
                    const xMod = xToEdge - totalWidth - offset
                    const yMod = offset
                    newTransformations.xMod = xMod
                    newTransformations.yMod = yMod
                } else if (calculatedCloseToEdge.bottom) {
                    const yToEdge = viewPort.height - e.clientY
                    const xMod = offset
                    const yMod = yToEdge - totalHeight - offset
                    newTransformations.xMod = xMod
                    newTransformations.yMod = yMod
                }
                setTransformations(newTransformations)
                setX(e.pageX)
                setY(e.pageY)
            }
        },
        [totalHeight, totalWidth, visible, transformations],
    )

    // useEffect to add and remove the mousemove event listener based on visibility
    useEffect(() => {
        if (visible) {
            window.addEventListener('mousemove', handleMouseMove)
        }
        // Cleanup event listener when the component is unmounted or hidden
        return (): void => {
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [visible, handleMouseMove]) // Re-run effect only when visibility changes

    // Calculate the necessary transformations (position and scale)

    // Render the zoomed image in a portal (so it renders outside normal DOM hierarchy)
    if ((x === 0 && y === 0) || !visible) {
        return null
    }

    return (
        <Portal>
            <Box
                position={'absolute'} // Position it absolutely on the screen
                top={y + yMod} // Y position based on the mouse location
                left={x + xMod} // X position based on the mouse location
                zIndex={10000} // Ensure it's rendered above other elements
                style={{
                    transform: `scale(${scale})`, // Apply scaling for zoom effect
                    transformOrigin: transformOrigin, // Set the origin for the scale transformation
                }}
            >
                <Box
                    style={{
                        // Rotate the main image from its center if it's horizontal
                        transform: `rotate(${imgHorizontal ? 90 : 0}deg) translateY(${
                            imgHorizontal ? -((height - width) / 2) : 0
                        }px)`,
                        transformOrigin: 'center center',
                    }}
                >
                    <img src={img} loading={'lazy'} style={{ borderRadius: '30px' }} />
                </Box>
            </Box>
            {otherImg && (
                <Box
                    position={'absolute'} // Position it absolutely on the screen
                    top={y + yMod} // Y position based on the mouse location
                    left={x + xMod + effectiveWidth * scale} // X position based on the mouse location
                    zIndex={10000} // Ensure it's rendered above other elements
                    style={{
                        transform: `scale(${scale})`, // Apply scaling for zoom effect
                        transformOrigin: transformOrigin, // Set the origin for the scale transformation
                    }}
                >
                    <img
                        src={otherImg}
                        loading={'lazy'}
                        style={{ transform: `rotate(${rotateOther === '180' ? 180 : 0}deg)` }}
                    />
                </Box>
            )}
        </Portal>
    )
}
