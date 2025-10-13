import { keyframes } from '@emotion/react'
import { Box, Skeleton, useMediaQuery } from '@mui/material'
import { debounce } from 'lodash'
import { FC, useEffect, useRef, useState } from 'react'

export type ImageWithSkeletonProps = {
    img: string
    width: number
    height: number
    hover?: boolean
    setHover?: (hover: boolean) => void
    enableGlow?: boolean
}

/**
 * ImageWithSkeleton lazily renders an image and displays a MUI Skeleton
 * placeholder until the image is loaded. It adapts dimensions for mobile
 * screens and can notify a parent hover state via setHover.
 */
export const ImageWithSkeleton: FC<ImageWithSkeletonProps> = (props) => {
    const { img, width, height, hover = false, setHover = () => {}, enableGlow = false } = props
    const [loaded, setLoaded] = useState(false)
    const imageRef = useRef<HTMLImageElement | null>(null)

    const isMobile = useMediaQuery('(max-width: 600px)')

    useEffect(() => {
        const current = imageRef.current
        if (current && current.complete && current.naturalWidth > 0 && current.naturalHeight > 0) {
            setLoaded(true)
        }
    }, [img])

    const shouldShowGlow = enableGlow && hover && loaded

    const onMouseLeave = debounce(() => setHover?.(false), 50)

    const handleMouseEnter = () => {
        setHover(true)
        setHover?.(true)
    }

    const handleMouseMove = () => {
        setHover(true)
        setHover?.(true)
    }

    const handleMouseLeave = () => {
        setHover(false)
        onMouseLeave()
    }

    return (
        <>
            <Box
                component="img"
                ref={imageRef}
                src={img}
                alt={''}
                loading="eager"
                onLoad={() => setLoaded(true)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                sx={{
                    display: loaded ? 'block' : 'none',
                    width: loaded ? (isMobile ? '100%' : `${width}px`) : '0px',
                    height: loaded ? (isMobile ? 'auto' : `${height}px`) : '0px',
                    filter: enableGlow ? (shouldShowGlow ? undefined : 'none') : undefined,
                    animation: shouldShowGlow ? `${dropShadowCycle} 4s linear infinite` : undefined,
                    animationFillMode: shouldShowGlow ? 'both' : undefined,
                    willChange: enableGlow ? 'filter' : undefined,
                }}
            />
            {!loaded && (
                <Skeleton
                    variant={'rectangular'}
                    width={isMobile ? '100%' : width}
                    height={isMobile ? 'auto' : height}
                />
            )}
        </>
    )
}

const dropShadowCycle = keyframes`
    0% {
        filter: drop-shadow(0 0 12px rgba(255, 0, 0, 0.7)) drop-shadow(0 0 24px rgba(255, 0, 0, 0.5));
    }
    25% {
        filter: drop-shadow(0 0 12px rgba(255, 127, 0, 0.7)) drop-shadow(0 0 24px rgba(255, 127, 0, 0.5));
    }
    50% {
        filter: drop-shadow(0 0 12px rgba(255, 255, 0, 0.7)) drop-shadow(0 0 24px rgba(255, 255, 0, 0.5));
    }
    75% {
        filter: drop-shadow(0 0 12px rgba(0, 255, 0, 0.7)) drop-shadow(0 0 24px rgba(0, 255, 0, 0.5));
    }
    100% {
        filter: drop-shadow(0 0 12px rgba(255, 0, 0, 0.7)) drop-shadow(0 0 24px rgba(255, 0, 0, 0.5));
    }
`
