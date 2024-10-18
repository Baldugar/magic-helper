import { Grid } from '@mui/material'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface TypeSelectorProps {
    selected: Record<string, TernaryBoolean>
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
    iconSize?: number | string
}

const TypeSelector = (props: TypeSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props

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

    console.log(selected)

    return (
        <Grid container item xs={'auto'}>
            {order.map((type) => (
                <Grid item key={type} xs={'auto'}>
                    <TernaryToggle
                        value={selected[type]}
                        type={'icon'}
                        imagesFolder={'type'}
                        imagesFormat={'svg'}
                        iconButtonProps={{
                            size: 'small',
                            onClick: () => onNext(type),
                            onContextMenu: (e) => {
                                e.preventDefault()
                                onPrev(type)
                            },
                        }}
                        imgProps={{
                            width: iconSize ?? 40,
                            height: iconSize ?? 40,
                            style: { opacity: selected[type] ? 1 : 0.3, transition: 'opacity 250ms' },
                        }}
                        option={type}
                    />
                </Grid>
            ))}
        </Grid>
    )
}

export default TypeSelector
