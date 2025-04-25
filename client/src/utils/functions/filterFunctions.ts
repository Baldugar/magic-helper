import { MTGFilterType } from '../../context/MTGA/Filter/MTGFilterContext'
import { isNotUnsetTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'

export const singleSetSelected = (filter: MTGFilterType) => {
    const setEntries = Object.entries(filter.sets)
        .filter(([, value]) => isNotUnsetTB(value.value))
        .map(([key, value]) => {
            return [key.toLowerCase(), value.value] as [string, TernaryBoolean]
        })

    if (setEntries.length === 1 && isPositiveTB(setEntries[0][1])) {
        return setEntries[0][0]
    }
    return undefined
}
