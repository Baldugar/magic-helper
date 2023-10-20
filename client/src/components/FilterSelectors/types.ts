import { BASE_TYPE, RARITY } from '../../types/enums'
import { TernaryBoolean } from '../../types/ternaryBoolean'
import { MCOLOR } from '../../types/types'

export type FilterTypes = MCOLOR | RARITY | BASE_TYPE

export type FilterTernaryToggleProps<T extends FilterTypes> = {
    filterOption: T
    value: TernaryBoolean
    onNext: (filterOption: T) => void
    onPrev?: (filterOption: T) => void
    imagesFolder: string
    imagesFormat: 'png' | 'svg'
    isDarkIcon?: boolean
}
