import { RARITY } from '../../../types/enums'
import { TernaryBoolean } from '../../../types/ternaryBoolean'
import { FilterTernaryToggle } from '../components'

export interface RaritySelectorProps {
    selected: { [key in RARITY]: TernaryBoolean }
    onNext: (filterOption: RARITY) => void
    onPrev: (filterOption: RARITY) => void
}

const RaritySelector = (props: RaritySelectorProps): JSX.Element => {
    const { onNext, onPrev, selected } = props

    const filterOptionsToRender = ['common', 'uncommon', 'rare', 'mythic'] as RARITY[]

    const renderColorTernaryToggle = (filterOption: RARITY) => {
        return (
            <FilterTernaryToggle<RARITY>
                filterOption={filterOption}
                value={selected[filterOption]}
                onNext={onNext}
                onPrev={onPrev}
                imagesFolder={'rarity'}
                imagesFormat={'png'}
            />
        )
    }

    return <>{filterOptionsToRender.map(renderColorTernaryToggle)}</>
}

export default RaritySelector
