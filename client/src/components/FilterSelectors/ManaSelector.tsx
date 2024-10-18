import { Grid } from '@mui/material'
import { MTGA_Color } from '../../graphql/types'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export type ManaSelectorProps = {
    iconSize?: number | string
    selected: Record<MTGA_Color, TernaryBoolean>
    next: (color: MTGA_Color) => void
    prev: (color: MTGA_Color) => void
    multi?: {
        value: TernaryBoolean
        next: () => void
        prev: () => void
    }
}

const ManaSelector = (props: ManaSelectorProps): JSX.Element => {
    const { next, prev, selected, iconSize, multi } = props

    const order = [MTGA_Color.W, MTGA_Color.U, MTGA_Color.B, MTGA_Color.R, MTGA_Color.G, MTGA_Color.C]

    return (
        <Grid container item xs={'auto'}>
            {order.map((color) => (
                <Grid item key={color} xs={'auto'}>
                    <TernaryToggle
                        value={selected[color]}
                        type={'icon'}
                        imagesFolder={'mana'}
                        imagesFormat={'svg'}
                        iconButtonProps={{
                            size: 'small',
                            onClick: () => next(color),
                            onContextMenu: (e) => {
                                e.preventDefault()
                                prev(color)
                            },
                        }}
                        imgProps={{
                            width: iconSize ?? 40,
                            height: iconSize ?? 40,
                            style: { opacity: selected[color] ? 1 : 0.3, transition: 'opacity 250ms' },
                        }}
                        option={color}
                    />
                </Grid>
            ))}
            {multi && (
                <Grid item xs={'auto'}>
                    <TernaryToggle
                        value={multi.value}
                        type={'icon'}
                        imagesFolder={'mana'}
                        imagesFormat={'svg'}
                        iconButtonProps={{
                            size: 'small',
                            onClick: multi.next,
                            onContextMenu: (e) => {
                                e.preventDefault()
                                multi.prev()
                            },
                        }}
                        imgProps={{
                            width: iconSize,
                            height: iconSize,
                            style: { opacity: multi.value ? 1 : 0.3, transition: 'opacity 250ms' },
                        }}
                        option={'M'}
                    />
                </Grid>
            )}
        </Grid>
    )
}

export default ManaSelector
