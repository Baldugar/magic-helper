import { IconButtonProps } from '@mui/material'
import TernaryToggle from '../TernaryToggle'
import { FilterTernaryToggleProps, FilterTypes } from './types'

export const FilterTernaryToggle = <T extends FilterTypes>(props: FilterTernaryToggleProps<T>): JSX.Element => {
    const { filterOption, value, onNext, onPrev, imagesFolder, imagesFormat, isDarkIcon } = props

    const onClick = () => onNext(filterOption)
    const onContextMenu = onPrev ? () => onPrev(filterOption) : undefined
    const iconButtonProps: IconButtonProps = {
        size: 'small',
        onClick,
        onContextMenu,
        sx: {
            backgroundColor: isDarkIcon ? 'white' : undefined,
        },
    }

    const imgProps: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> = {
        src: `/img/${imagesFolder}/${filterOption}.${imagesFormat}`,
        width: 40,
        height: 40,
        style: {
            opacity: value ? 1 : 0.3,
            transition: 'opacity 250ms',
        },
    }

    return <TernaryToggle value={value} type={'icon'} iconButtonProps={iconButtonProps} imgProps={imgProps} />
}
