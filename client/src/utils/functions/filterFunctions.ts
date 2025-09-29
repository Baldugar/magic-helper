import { MTGFilterType } from '../../context/MTGA/Filter/MTGFilterContext'
import { MTG_Card, MTG_CardVersion, MTG_Game, TernaryBoolean } from '../../graphql/types'
import { isNegativeTB, isNotUnsetTB, isPositiveTB } from '../../types/ternaryBoolean'

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

export const getCardVersionsMatchingFilter = (card: MTG_Card, filter: MTGFilterType): MTG_CardVersion[] => {
    const allVersions = card.versions

    const setEntries = Object.entries(filter.sets)
        .filter(([, value]) => isNotUnsetTB(value.value))
        .map(([key, value]) => [key.toLowerCase(), value.value] as [string, TernaryBoolean])
    const positiveSets = setEntries.filter(([, value]) => isPositiveTB(value)).map(([code]) => code)
    const negativeSets = setEntries.filter(([, value]) => isNegativeTB(value)).map(([code]) => code)

    const gameEntries = Object.entries(filter.games).filter(([, value]) => isNotUnsetTB(value)) as [
        MTG_Game,
        TernaryBoolean,
    ][]
    const positiveGames = gameEntries.filter(([, value]) => isPositiveTB(value)).map(([game]) => game)
    const negativeGames = gameEntries.filter(([, value]) => isNegativeTB(value)).map(([game]) => game)

    const matchingVersions = allVersions.filter((version) => {
        const setCode = version.set.toLowerCase()

        if (positiveSets.length > 0 && !positiveSets.includes(setCode)) {
            return false
        }

        if (negativeSets.length > 0 && negativeSets.includes(setCode)) {
            return false
        }

        if (positiveGames.length > 0 && !positiveGames.some((game) => version.games.includes(game))) {
            return false
        }

        if (negativeGames.length > 0 && negativeGames.some((game) => version.games.includes(game))) {
            return false
        }

        return true
    })

    return matchingVersions.length > 0 ? matchingVersions : allVersions
}

export const getRandomVersionFromFilter = (filter: MTGFilterType, card: MTG_Card) => {
    const versions = getCardVersionsMatchingFilter(card, filter)
    if (versions.length === 0) {
        return undefined
    }
    if (versions.length === 1) {
        return versions[0]
    }

    const defaultVersion = versions.find((v) => v.isDefault)
    if (defaultVersion) {
        return defaultVersion
    }

    return versions[Math.floor(Math.random() * versions.length)]
}
