import { Grid } from '@mui/material'
import { MTGA_Rarity } from '../../graphql/types'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface RaritySelectorProps {
    selected: { [key in MTGA_Rarity]: TernaryBoolean }
    onNext: (filterOption: MTGA_Rarity) => void
    onPrev: (filterOption: MTGA_Rarity) => void
    iconSize?: number | string
}

const RaritySelector = (props: RaritySelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props

    const order = [MTGA_Rarity.COMMON, MTGA_Rarity.UNCOMMON, MTGA_Rarity.RARE, MTGA_Rarity.MYTHIC]

    return (
        <Grid container item xs={'auto'}>
            {order.map((r) => {
                return (
                    <Grid item key={r}>
                        <TernaryToggle
                            value={selected[r]}
                            type={'icon'}
                            imagesFolder={'rarity'}
                            imagesFormat={'png'}
                            iconButtonProps={{
                                size: 'small',
                                onClick: () => onNext(r),
                                onContextMenu: (e) => {
                                    e.preventDefault()
                                    onPrev(r)
                                },
                            }}
                            imgProps={{
                                width: iconSize ?? 40,
                                height: iconSize ?? 40,
                                style: { opacity: selected[r] ? 1 : 0.3, transition: 'opacity 250ms' },
                            }}
                            option={r.toLowerCase()}
                        />
                    </Grid>
                )
            })}
        </Grid>
    )
}

export default RaritySelector
