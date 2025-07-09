import { Check, CheckBox, CheckBoxOutlineBlank, Close, IndeterminateCheckBox, Remove } from '@mui/icons-material'
import {
    Box,
    Button,
    ButtonProps,
    Checkbox,
    CheckboxProps,
    FormControl,
    FormControlLabel,
    FormControlLabelProps,
    IconButton,
    IconButtonProps,
    styled,
    ToggleButton,
    ToggleButtonGroup,
    ToggleButtonGroupProps,
} from '@mui/material'
import { DetailedHTMLProps, ImgHTMLAttributes } from 'react'
import { TernaryBoolean } from '../../graphql/types'
import { isNegativeTB, isNotUnsetTB, isPositiveTB } from '../../types/ternaryBoolean'
import TagPill, { TagPillProps } from '../TagPill'

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
          checkboxProps: CheckboxProps & { onClick: () => void; onContextMenu: () => void }
      }
    | {
          value: TernaryBoolean
          type: 'toggleButton'
          toggleButtonGroupProps: ToggleButtonGroupProps
      }
    | {
          value: TernaryBoolean
          type: 'textButton'
          textButtonProps: ButtonProps
      }
    | {
          value: TernaryBoolean
          type: 'tag'
          tagProps: TagPillProps & { onClick: () => void; onContextMenu: () => void }
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
        case 'checkbox': {
            const { value, labelProps, checkboxProps } = props

            const indeterminate = value === TernaryBoolean.UNSET
            const checked = value === TernaryBoolean.TRUE
            return (
                <FormControlLabel
                    {...labelProps}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (checkboxProps?.onClick) {
                            checkboxProps.onClick()
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (checkboxProps?.onContextMenu) {
                            checkboxProps.onContextMenu()
                        }
                    }}
                    control={
                        <Checkbox
                            {...checkboxProps}
                            indeterminate={indeterminate}
                            checked={checked}
                            icon={<IndeterminateCheckBox />}
                            checkedIcon={<CheckBox />}
                            indeterminateIcon={<CheckBoxOutlineBlank />}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (checkboxProps?.onClick) {
                                    checkboxProps.onClick()
                                }
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (checkboxProps?.onContextMenu) {
                                    checkboxProps.onContextMenu()
                                }
                            }}
                            sx={{
                                '&.MuiCheckbox-root.Mui-checked': {
                                    color: 'success.main',
                                },
                                '& .MuiSvgIcon-root': {
                                    fontSize: 20,
                                },
                                /* color rojo cuando valor = FALSE */
                                ...(isNegativeTB(value) && {
                                    color: 'error.main',
                                }),
                            }}
                        />
                    }
                />
            )
        }
        case 'textButton': {
            const { textButtonProps, value } = props
            return (
                <Button
                    {...textButtonProps}
                    fullWidth
                    sx={{
                        position: 'relative',
                    }}
                >
                    {textButtonProps.children}
                    <Box
                        sx={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {isNotUnsetTB(value) && (
                            <img
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: isPositiveTB(value) ? '#00ff00' : '#ff0000',
                                    borderRadius: '50%',
                                    opacity: 0.5,
                                }}
                                src={`/img/general/${isPositiveTB(value) ? 'check' : 'cancel'}.svg`}
                            />
                        )}
                    </Box>
                </Button>
            )
        }
        case 'toggleButton': {
            const { value, toggleButtonGroupProps } = props
            const PositiveToggleButton = styled(ToggleButton)(({ theme }) => ({
                '&.Mui-selected': {
                    backgroundColor: theme.palette.success.light,
                    color: theme.palette.success.contrastText,
                    '&:hover': {
                        backgroundColor: theme.palette.success.main,
                    },
                },
            }))

            const NeutralToggleButton = styled(ToggleButton)(({ theme }) => ({
                '&.Mui-selected': {
                    backgroundColor: theme.palette.grey[300],
                    color: theme.palette.text.primary,
                    '&:hover': {
                        backgroundColor: theme.palette.grey[400],
                    },
                },
            }))

            const NegativeToggleButton = styled(ToggleButton)(({ theme }) => ({
                '&.Mui-selected': {
                    backgroundColor: theme.palette.error.light,
                    color: theme.palette.error.contrastText,
                    '&:hover': {
                        backgroundColor: theme.palette.error.main,
                    },
                },
            }))
            return (
                <ToggleButtonGroup {...toggleButtonGroupProps} value={value} exclusive>
                    <PositiveToggleButton value={TernaryBoolean.TRUE}>
                        <Check fontSize="small" />
                    </PositiveToggleButton>

                    <NeutralToggleButton value={TernaryBoolean.UNSET}>
                        <Remove fontSize="small" />
                    </NeutralToggleButton>

                    <NegativeToggleButton value={TernaryBoolean.FALSE}>
                        <Close fontSize="small" />
                    </NegativeToggleButton>
                </ToggleButtonGroup>
            )
        }
        case 'tag': {
            const { tagProps, value } = props
            const indeterminate = value === TernaryBoolean.UNSET
            const checked = value === TernaryBoolean.TRUE
            return (
                <Box display={'flex'} alignItems={'flex-start'}>
                    <FormControl
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (tagProps?.onClick) {
                                tagProps.onClick()
                            }
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (tagProps?.onContextMenu) {
                                tagProps.onContextMenu()
                            }
                        }}
                    >
                        <Checkbox
                            indeterminate={indeterminate}
                            checked={checked}
                            icon={<IndeterminateCheckBox />}
                            checkedIcon={<CheckBox />}
                            indeterminateIcon={<CheckBoxOutlineBlank />}
                        />
                    </FormControl>
                    <TagPill {...tagProps} />
                </Box>
            )
        }
    }
    return <></>
}
