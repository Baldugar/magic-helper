import { Skeleton, useMediaQuery } from '@mui/material'
import { debounce } from 'lodash'
import { CSSProperties, FC, useState } from 'react'

export type ImageWithSkeletonProps = {
    img: string
    width: number
    height: number
    setHover?: (hover: boolean) => void
}

/**
 * ImageWithSkeleton lazily renders an image and displays a MUI Skeleton
 * placeholder until the image is loaded. It adapts dimensions for mobile
 * screens and can notify a parent hover state via setHover.
 */
export const ImageWithSkeleton: FC<ImageWithSkeletonProps> = (props) => {
    const { img, width, height, setHover = () => {} } = props
    const [loaded, setLoaded] = useState(false)

    const isMobile = useMediaQuery('(max-width: 600px)')

    const style: CSSProperties = {}
    style.display = loaded ? 'block' : 'hidden'
    style.width = loaded ? (isMobile ? '100%' : `${width}px`) : '0px'
    style.height = loaded ? (isMobile ? 'auto' : `${height}px`) : '0px'

    const onMouseLeave = debounce(() => setHover?.(false), 50)

    return (
        <>
            <img
                src={img}
                alt={''}
                style={style}
                loading={'lazy'}
                onLoad={() => setLoaded(true)}
                onMouseEnter={() => setHover?.(true)}
                onMouseLeave={() => onMouseLeave()}
                onMouseMove={() => setHover?.(true)}
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
