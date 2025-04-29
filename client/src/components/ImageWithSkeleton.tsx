import { Skeleton } from '@mui/material'
import { debounce } from 'lodash'
import { CSSProperties, FC, useState } from 'react'

export type ImageWithSkeletonProps = {
    img: string
    width: number
    height: number
    setHover: (hover: boolean) => void
}

export const ImageWithSkeleton: FC<ImageWithSkeletonProps> = (props) => {
    const { img, width, height, setHover } = props
    const [loaded, setLoaded] = useState(false)

    const style: CSSProperties = {}
    style.display = loaded ? 'block' : 'hidden'
    style.width = loaded ? `${width}px` : '0px'
    style.height = loaded ? `${height}px` : '0px'

    const onMouseLeave = debounce(() => setHover(false), 50)

    return (
        <>
            <img
                src={img}
                alt={''}
                style={style}
                loading={'lazy'}
                onLoad={() => setLoaded(true)}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => onMouseLeave()}
                onMouseMove={() => setHover(true)}
            />
            {!loaded && <Skeleton variant={'rectangular'} width={width} height={height} />}
        </>
    )
}
