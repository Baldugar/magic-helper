import { MTGFilterType, SetFilter } from '../../context/MTGA/Filter/MTGFilterContext'
import { MTG_Card, TernaryBoolean } from '../../graphql/types'
import { isPositiveTB } from '../../types/ternaryBoolean'

export const singleSetSelected = (filter: MTGFilterType) => {
    const setEntries = Object.entries(filter.sets)
        .filter(([, value]) => isPositiveTB(value.value))
        .map(([key, value]) => {
            return [key.toLowerCase(), value.value] as [string, TernaryBoolean]
        })

    if (setEntries.length === 1 && isPositiveTB(setEntries[0][1])) {
        return setEntries[0][0]
    }
    return undefined
}

export const getRandomVersionFromFilter = (sets: Record<string, SetFilter>, card: MTG_Card) => {
    const setEntries = Object.entries(sets)
        .filter(([, value]) => isPositiveTB(value.value))
        .map(([key]) => {
            return key.toLowerCase()
        })

    if (setEntries.length === 0) {
        const isDefault = card.versions.find((v) => v.isDefault)
        if (isDefault) return isDefault
    }

    const setsInCard = card.versions.filter((v) => setEntries.includes(v.set))
    if (setsInCard.length === 0) {
        const isDefault = card.versions.find((v) => v.isDefault)
        if (isDefault) return isDefault
    }

    const version = setsInCard[Math.floor(Math.random() * setsInCard.length)]
    if (!version) {
        const isDefault = card.versions.find((v) => v.isDefault)
        if (isDefault) return isDefault
    }
    return version
}
