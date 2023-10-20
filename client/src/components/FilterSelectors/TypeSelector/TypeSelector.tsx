import { BASE_TYPE } from '../../../types/enums'
import { TernaryBoolean } from '../../../types/ternaryBoolean'
import { FilterTernaryToggle } from '../components'

export interface TypeSelectorProps {
    selected: { [key in BASE_TYPE]: TernaryBoolean }
    onNext: (filterOption: BASE_TYPE) => void
    onPrev: (filterOption: BASE_TYPE) => void
}

const TypeSelector = (props: TypeSelectorProps): JSX.Element => {
    const { onNext, onPrev, selected } = props

    const filterOptionsToRender = [
        'Artifact',
        'Battle',
        'Creature',
        'Enchantment',
        'Instant',
        'Land',
        'Planeswalker',
        'Snow',
        'Sorcery',
    ] as BASE_TYPE[]

    const renderColorTernaryToggle = (filterOption: BASE_TYPE) => {
        return (
            <FilterTernaryToggle<BASE_TYPE>
                filterOption={filterOption}
                value={selected[filterOption]}
                onNext={onNext}
                onPrev={onPrev}
                imagesFolder={'type'}
                imagesFormat={'svg'}
                isDarkIcon
            />
        )
    }

    return <>{filterOptionsToRender.map(renderColorTernaryToggle)}</>
}

export default TypeSelector
