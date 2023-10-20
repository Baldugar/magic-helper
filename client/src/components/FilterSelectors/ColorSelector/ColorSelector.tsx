import { TernaryBoolean } from '../../../types/ternaryBoolean'
import { MCOLOR } from '../../../types/types'
import { FilterTernaryToggle } from '../components'

export interface ColorSelectorProps {
    selected: { [key in MCOLOR]: TernaryBoolean }
    onNext: (filterOption: MCOLOR) => void
    onPrev: (filterOption: MCOLOR) => void
}

const ColorSelector = (props: ColorSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected } = props

    const filterOptionsToRender = ['W', 'U', 'B', 'R', 'G', 'C', 'M'] as MCOLOR[]

    const renderColorTernaryToggle = (filterOption: MCOLOR) => {
        return (
            <FilterTernaryToggle<MCOLOR>
                filterOption={filterOption}
                value={selected[filterOption]}
                onNext={onNext}
                onPrev={onPrev}
                imagesFolder={'mana'}
                imagesFormat={'svg'}
            />
        )
    }

    return <>{filterOptionsToRender.map(renderColorTernaryToggle)}</>
}

export default ColorSelector
