import {
    Box,
    Button,
    ButtonProps,
    Checkbox,
    CheckboxProps,
    FormControlLabel,
    FormControlLabelProps,
    IconButton,
    IconButtonProps,
} from '@mui/material'
import { DetailedHTMLProps, ImgHTMLAttributes } from 'react'
import { TernaryBoolean, isNegativeTB, isNotUnsetTB, isPositiveTB } from '../../types/ternaryBoolean'

export type TernaryToggleProps =
    | {
          value: TernaryBoolean
          type: 'icon'
          iconButtonProps: IconButtonProps
          imgProps: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>
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

const TernaryToggle = (props: TernaryToggleProps): JSX.Element => {
    const { type } = props
    switch (type) {
        case 'checkbox': {
            const { labelProps, checkboxProps, value } = props
            const control = (
                <Checkbox checked={isPositiveTB(value)} indeterminate={isNegativeTB(value)} {...checkboxProps} />
            )
            return <FormControlLabel {...labelProps} control={control} />
        }
        case 'icon': {
            const { iconButtonProps, imgProps, value } = props
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
            const onContextMenu: React.MouseEventHandler<HTMLButtonElement> = (e) => {
                if (iconButtonProps.onContextMenu) {
                    e.preventDefault()
                    iconButtonProps.onContextMenu(e)
                }
            }
            const style: React.CSSProperties = { ...imgProps.style, position: 'relative' }
            const imgStyle: React.CSSProperties = {
                position: 'absolute',
                top: imgHeight && iconHeight ? (imgHeight - iconHeight) / 2 + 5 : 0,
                backgroundColor: isPositiveTB(value) ? '#00ff00' : '#ff0000',
                borderRadius: imgHeight ? imgHeight / 2 : undefined,
            }
            return (
                <IconButton {...iconButtonProps} onContextMenu={onContextMenu}>
                    <img {...imgProps} style={style} />
                    {isNotUnsetTB(value) && (
                        <img
                            style={imgStyle}
                            width={iconWidth}
                            height={iconHeight}
                            src={`/img/general/${isPositiveTB(value) ? 'check' : 'cancel'}.svg`}
                        />
                    )}
                </IconButton>
            )
        }
        case 'button': {
            const { buttonProps, value } = props
            const imgHeight = 52
            const iconWidth = imgHeight / 4
            const iconHeight = imgHeight / 4
            const imgStyle: React.CSSProperties = {
                position: 'absolute',
                top: imgHeight && iconHeight ? (imgHeight - iconHeight) / 2 : 0,
                left: imgHeight && iconWidth ? (imgHeight - iconWidth) / 2 + 6 : 0,
                backgroundColor: isPositiveTB(value) ? '#00ff00' : '#ff0000',
                borderRadius: imgHeight ? imgHeight / 2 : undefined,
            }
            return (
                <Box position={'relative'}>
                    <Button variant={'contained'} {...buttonProps} />
                    {isNotUnsetTB(value) && (
                        <img
                            style={imgStyle}
                            width={iconWidth}
                            height={iconHeight}
                            src={`/img/general/${isPositiveTB(value) ? 'check' : 'cancel'}.svg`}
                        />
                    )}
                </Box>
            )
        }
    }
}

export default TernaryToggle
