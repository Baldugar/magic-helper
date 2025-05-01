import { Badge, Box, Button, ButtonBase, ClickAwayListener, Grid, Paper, Popper, Typography } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { isNegativeTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface TypeSelectorProps {
    selected: Record<string, TernaryBoolean>
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    iconSize?: number | string
}

const TypeSelector = (props: TypeSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const order: string[] = [
        'Artifact',
        'Battle',
        'Creature',
        'Enchantment',
        'Instant',
        'Land',
        'Planeswalker',
        'Snow',
        'Sorcery',
    ]

    const howManyPositive = Object.values(selected).filter(isPositiveTB).length
    const howManyNegative = Object.values(selected).filter(isNegativeTB).length

    return (
        <Grid container item xs={'auto'}>
            <Badge
                badgeContent={howManyPositive}
                color="success"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Badge
                    badgeContent={howManyNegative}
                    color="error"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Button onClick={handleClick}>Type</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl}>
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper
                        sx={{
                            maxHeight: '80vh',
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {order.map((type) => (
                            <ButtonBase
                                key={type}
                                onClick={() => onNext(type)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    onPrev(type)
                                }}
                                sx={{ paddingX: 2 }}
                            >
                                <Box display={'flex'} width={1} alignItems={'center'}>
                                    <TernaryToggle
                                        value={selected[type]}
                                        type={'icon'}
                                        imagesFolder={'type'}
                                        imagesFormat={'svg'}
                                        iconButtonProps={{
                                            size: 'small',
                                            onClick: () => {},
                                            onContextMenu: () => {},
                                        }}
                                        imgProps={{
                                            width: iconSize ?? 40,
                                            height: iconSize ?? 40,
                                            style: {
                                                opacity: selected[type] ? 1 : 0.3,
                                                transition: 'opacity 250ms',
                                            },
                                        }}
                                        option={type}
                                    />
                                    <Typography>{type}</Typography>
                                </Box>
                            </ButtonBase>
                        ))}
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default TypeSelector
