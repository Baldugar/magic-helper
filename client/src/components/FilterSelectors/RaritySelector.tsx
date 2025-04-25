import { Grid } from '@mui/material'
import { MTG_Rarity } from '../../graphql/types'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface RaritySelectorProps {
    selected: { [key in MTG_Rarity]: TernaryBoolean }
    onNext: (filterOption: MTG_Rarity) => void
    onPrev: (filterOption: MTG_Rarity) => void
    iconSize?: number | string
}

const RaritySelector = (props: RaritySelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props

    const order = [MTG_Rarity.common, MTG_Rarity.uncommon, MTG_Rarity.rare, MTG_Rarity.mythic]

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
