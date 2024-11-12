import { ButtonProps, CheckboxProps, FormControlLabelProps, IconButton, IconButtonProps } from '@mui/material'
import { DetailedHTMLProps, ImgHTMLAttributes } from 'react'
import { isNotUnsetTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'

export type TernaryToggleProps =
    | {
          value: TernaryBoolean
          type: 'icon'
          iconButtonProps: IconButtonProps
          imgProps: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>
          imagesFolder?: string
          option?: string
          imagesFormat?: 'png' | 'svg'
          isDarkIcon?: boolean
          URL?: string
      }
    | {
          value: TernaryBoolean
          type: 'checkbox'
          labelProps: Omit<FormControlLabelProps, 'control'>
          checkboxProps: CheckboxProps
      }
    | {
          value: TernaryBoolean
          type: 'button'
          buttonProps?: ButtonProps
      }

export const TernaryToggle = (props: TernaryToggleProps): JSX.Element => {
    const { type } = props

    switch (type) {
        case 'icon': {
            const { iconButtonProps, imgProps, value, imagesFolder, imagesFormat, option, isDarkIcon, URL } = props
            const IProps: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> = {
                ...imgProps,
                src: URL ?? `/img/${imagesFolder}/${option}.${imagesFormat}`,
                style: {
                    opacity: value ? 1 : 0.3,
                    transition: 'opacity 250ms',
                },
            }
            const imgWidth = imgProps.width
                ? typeof imgProps.width === 'string'
                    ? Number(imgProps.width.split('px')[0])
                    : imgProps.width
                : undefined
            const imgHeight = imgProps.height
                ? typeof imgProps.height === 'string'
                    ? Number(imgProps.height.split('px')[0])
                    : imgProps.height
                : undefined
            const iconWidth = imgWidth ? imgWidth / 4 : undefined
            const iconHeight = imgHeight ? imgHeight / 4 : undefined

            return (
                <IconButton
                    {...iconButtonProps}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        if (iconButtonProps.onContextMenu) {
                            iconButtonProps.onContextMenu(e)
                        }
                    }}
                    sx={{
                        backgroundColor: isDarkIcon ? 'white' : undefined,
                    }}
                >
                    <img {...IProps} style={{ ...imgProps.style, position: 'relative' }} />
                    {isNotUnsetTB(value) && (
                        <img
                            style={{
                                position: 'absolute',
                                top: imgHeight && iconHeight ? (imgHeight - iconHeight) / 2 + 5 : 0,
                                backgroundColor: isPositiveTB(value) ? '#00ff00' : '#ff0000',
                                borderRadius: imgHeight ? imgHeight / 2 : undefined,
                            }}
                            width={iconWidth}
                            height={iconHeight}
                            src={`/img/general/${isPositiveTB(value) ? 'check' : 'cancel'}.svg`}
                        />
                    )}
                </IconButton>
            )
        }
        case 'checkbox':
            break
        case 'button':
            break
    }
    return <></>
}
