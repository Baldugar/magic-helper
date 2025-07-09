import { Grid } from '@mui/material'
import { CMCFilter } from '../../context/MTGA/Filter/MTGFilterContext'
import { TernaryBoolean } from '../../graphql/types'
import { TernaryToggle } from './TernaryToggle'

export type CMCSelectorProps = {
    selected: Record<CMCFilter, TernaryBoolean>
    onNext: (cmc: CMCFilter) => void
    onPrev: (cmc: CMCFilter) => void
    iconSize?: number | string
}

export const CMCSelector = (props: CMCSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected, iconSize } = props

    const order: CMCFilter[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'infinite']

    return (
        <Grid container item xs={'auto'} wrap="wrap">
            {order.map((cmc) => (
                <Grid item key={cmc} xs={3} md={'auto'}>
                    <TernaryToggle
                        value={selected[cmc]}
                        type={'icon'}
                        imagesFolder={'cmc'}
                        imagesFormat={'svg'}
                        iconButtonProps={{
                            size: 'small',
                            onClick: () => onNext(cmc),
                            onContextMenu: (e) => {
                                e.preventDefault()
                                onPrev(cmc)
                            },
                        }}
                        imgProps={{
                            width: iconSize ?? 40,
                            height: iconSize ?? 40,
                            style: { opacity: selected[cmc] ? 1 : 0.3, transition: 'opacity 250ms' },
                        }}
                        option={cmc.toString()}
                    />
                </Grid>
            ))}
        </Grid>
    )
}
