import { cloneDeep, orderBy } from 'lodash'
import { CMCFilter, MTGAFilterType, SortDirection, SortEnum } from '../../context/MTGA/Filter/MTGAFilterContext'
import { MTGA_Card, MTGA_Color, MTGA_Rarity } from '../../graphql/types'
import { isNegativeTB, isNotUnsetTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'

export const filterCards = <T extends MTGA_Card>(
    cards: T[],
    filter: MTGAFilterType,
    sortBy: SortEnum,
    sortDirection: SortDirection,
    selectingCommander?: boolean,
): MTGA_Card[] => {
    let remainingCards = cloneDeep(cards)

    if (selectingCommander) {
        remainingCards = remainingCards.filter(
            (card) =>
                card.typeLine.includes('Legendary') &&
                (card.typeLine.includes('Creature') || card.typeLine.includes('Planeswalker')),
        )
    }

    // Search TODO: Implement search

    // Color
    const colorEntries = Object.entries(filter.color).filter(([, value]) => isNotUnsetTB(value)) as [
        MTGA_Color,
        TernaryBoolean,
    ][]
    const multi = filter.multiColor
    if (colorEntries.length > 0) {
        // SOLO 1
        if (colorEntries.length === 1) {
            // POSITIVO
            if (isPositiveTB(colorEntries[0][1])) {
                remainingCards = remainingCards.filter(
                    (card) =>
                        card.colorIdentity.includes(colorEntries[0][0]) &&
                        (isPositiveTB(multi)
                            ? card.colorIdentity.length > 1
                            : isNegativeTB(multi)
                            ? card.colorIdentity.length === 1
                            : true),
                )
            } else {
                // NEGATIVO
                remainingCards = remainingCards.filter(
                    (card) =>
                        !card.colorIdentity.includes(colorEntries[0][0]) &&
                        (isPositiveTB(multi)
                            ? card.colorIdentity.length > 1
                            : isNegativeTB(multi)
                            ? card.colorIdentity.length === 1
                            : true),
                )
            }
        } else {
            // TODOS POSITIVOS
            if (colorEntries.every(([, value]) => isPositiveTB(value))) {
                const colors = colorEntries.map(([color]) => color)
                if (isPositiveTB(multi)) {
                    remainingCards = remainingCards.filter(
                        (card) => colors.every((c) => card.colorIdentity.includes(c)) && card.colorIdentity.length > 1,
                    )
                } else if (isNegativeTB(multi)) {
                    remainingCards = remainingCards.filter(
                        (card) => colors.some((c) => card.colorIdentity.includes(c)) && card.colorIdentity.length === 1,
                    )
                } else {
                    remainingCards = remainingCards.filter((card) => colors.some((c) => card.colorIdentity.includes(c)))
                }
            }
            // TODOS NEGATIVOS
            else if (colorEntries.every(([, value]) => isNegativeTB(value))) {
                const colors = colorEntries.map(([color]) => color)
                remainingCards = remainingCards.filter(
                    (card) =>
                        card.colorIdentity.every((c) => !colors.includes(c)) &&
                        (isPositiveTB(multi)
                            ? card.colorIdentity.length > 1
                            : isNegativeTB(multi)
                            ? card.colorIdentity.length === 1
                            : true),
                )
            }
            // MIXTO
            else {
                const positiveColors = colorEntries.filter(([, color]) => isPositiveTB(color))
                const negativeColors = colorEntries.filter(([, color]) => isNegativeTB(color))
                remainingCards = remainingCards.filter(
                    (card) =>
                        card.colorIdentity.some((c) => positiveColors.map(([color]) => color).includes(c)) &&
                        card.colorIdentity.every((c) => !negativeColors.map(([color]) => color).includes(c)) &&
                        (isPositiveTB(multi)
                            ? card.colorIdentity.length > 1
                            : isNegativeTB(multi)
                            ? card.colorIdentity.length === 1
                            : true),
                )
            }
        }
    } else {
        if (isPositiveTB(multi)) {
            remainingCards = remainingCards.filter((card) => card.colorIdentity.length > 1)
        } else if (isNegativeTB(multi)) {
            remainingCards = remainingCards.filter((card) => card.colorIdentity.length === 1)
        }
    }
    console.log('After color filter', remainingCards)

    // Rarity
    const rarityEntries = Object.entries(filter.rarity).filter(([, value]) => isNotUnsetTB(value)) as [
        MTGA_Rarity,
        TernaryBoolean,
    ][]
    if (rarityEntries.length > 0) {
        if (rarityEntries.length === 1) {
            if (isPositiveTB(rarityEntries[0][1])) {
                remainingCards = remainingCards.filter((card) => card.rarity === rarityEntries[0][0])
            } else {
                remainingCards = remainingCards.filter((card) => card.rarity !== rarityEntries[0][0])
            }
        } else {
            const positiveRarities = rarityEntries.filter(([, value]) => isPositiveTB(value))
            const negativeRarities = rarityEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveRarities.length === rarityEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveRarities.some(([rarity]) => rarity === card.rarity),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeRarities.length === rarityEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeRarities.every(([rarity]) => rarity !== card.rarity),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveRarities.some(([rarity]) => rarity === card.rarity) &&
                        negativeRarities.every(([rarity]) => rarity !== card.rarity),
                )
            }
        }
    }
    console.log('After rarity filter', remainingCards)

    // Mana Costs
    const manaCostEntries = Object.entries(filter.manaCosts).filter(([, value]) => isNotUnsetTB(value)) as [
        CMCFilter,
        TernaryBoolean,
    ][]
    if (manaCostEntries.length > 0) {
        console.log('Mana cost entries', manaCostEntries)
        if (manaCostEntries.length === 1) {
            const isInfinite = manaCostEntries[0][0] === 'infinite'
            if (isPositiveTB(manaCostEntries[0][1])) {
                remainingCards = remainingCards.filter((card) =>
                    isInfinite ? card.cmc > 9 : card.cmc === Number(manaCostEntries[0][0]),
                )
            } else {
                remainingCards = remainingCards.filter((card) =>
                    isInfinite ? card.cmc <= 9 : card.cmc !== Number(manaCostEntries[0][0]),
                )
            }
        } else {
            const positiveManaCosts = manaCostEntries.filter(([, value]) => isPositiveTB(value))
            const negativeManaCosts = manaCostEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveManaCosts.length === manaCostEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveManaCosts.some(([manaCost]) => {
                        const isInfinite = manaCost === 'infinite'
                        return isInfinite ? card.cmc > 9 : Number(manaCost) === card.cmc
                    }),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeManaCosts.length === manaCostEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeManaCosts.every(([manaCost]) => {
                        const isInfinite = manaCost === 'infinite'
                        return isInfinite ? card.cmc <= 9 : Number(manaCost) !== card.cmc
                    }),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveManaCosts.some(([manaCost]) => {
                            const isInfinite = manaCost === 'infinite'
                            return isInfinite ? card.cmc > 9 : Number(manaCost) === card.cmc
                        }) &&
                        negativeManaCosts.every(([manaCost]) => {
                            const isInfinite = manaCost === 'infinite'
                            return isInfinite ? card.cmc <= 9 : Number(manaCost) !== card.cmc
                        }),
                )
            }
        }
    }
    console.log('After mana cost filter', remainingCards)

    // Expansion
    const setEntries = Object.entries(filter.sets).filter(([, value]) => isNotUnsetTB(value)) as [
        string,
        TernaryBoolean,
    ][]
    if (setEntries.length > 0) {
        if (setEntries.length === 1) {
            if (isPositiveTB(setEntries[0][1])) {
                remainingCards = remainingCards.filter((card) => card.set === setEntries[0][0])
            } else {
                remainingCards = remainingCards.filter((card) => card.set !== setEntries[0][0])
            }
        } else {
            const positiveSets = setEntries.filter(([, value]) => isPositiveTB(value))
            const negativeSets = setEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveSets.length === setEntries.length) {
                remainingCards = remainingCards.filter((card) => positiveSets.some(([set]) => set === card.set))
            }
            // TODOS NEGATIVOS
            else if (negativeSets.length === setEntries.length) {
                remainingCards = remainingCards.filter((card) => negativeSets.every(([set]) => set !== card.set))
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveSets.some(([set]) => set === card.set) &&
                        negativeSets.every(([set]) => set !== card.set),
                )
            }
        }
    }
    console.log('After set filter', remainingCards)

    // Card Types
    const cardTypeEntries = Object.entries(filter.cardTypes).filter(([, value]) => isNotUnsetTB(value)) as [
        string,
        TernaryBoolean,
    ][]
    if (cardTypeEntries.length > 0) {
        if (cardTypeEntries.length === 1) {
            if (isPositiveTB(cardTypeEntries[0][1])) {
                remainingCards = remainingCards.filter((card) => card.typeLine.includes(cardTypeEntries[0][0]))
            } else {
                remainingCards = remainingCards.filter((card) => !card.typeLine.includes(cardTypeEntries[0][0]))
            }
        } else {
            const positiveCardTypes = cardTypeEntries.filter(([, value]) => isPositiveTB(value))
            const negativeCardTypes = cardTypeEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveCardTypes.length === cardTypeEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveCardTypes.some(([cardType]) => card.typeLine.includes(cardType)),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeCardTypes.length === cardTypeEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeCardTypes.every(([cardType]) => !card.typeLine.includes(cardType)),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveCardTypes.some(([cardType]) => card.typeLine.includes(cardType)) &&
                        negativeCardTypes.every(([cardType]) => !card.typeLine.includes(cardType)),
                )
            }
        }
    }
    console.log('After card type filter', remainingCards)

    // Subtypes
    const subtypeEntries = Object.entries(filter.subtypes).filter(([, value]) =>
        Object.values(value).some((v) => isNotUnsetTB(v)),
    ) as [string, Record<string, TernaryBoolean>][]
    if (subtypeEntries.length > 0) {
        for (const [cardType, subtypes] of subtypeEntries) {
            const positiveSubtypes = Object.entries(subtypes).filter(([, value]) => isPositiveTB(value))
            const negativeSubtypes = Object.entries(subtypes).filter(([, value]) => isNegativeTB(value))
            if (positiveSubtypes.length > 0) {
                remainingCards = remainingCards.filter((card) =>
                    positiveSubtypes.every(
                        ([subtype]) => card.typeLine.includes(cardType) && card.typeLine.includes(subtype),
                    ),
                )
            }
            if (negativeSubtypes.length > 0) {
                remainingCards = remainingCards.filter((card) =>
                    negativeSubtypes.every(
                        ([subtype]) => !card.typeLine.includes(cardType) || !card.typeLine.includes(subtype),
                    ),
                )
            }
        }
    }
    console.log('After subtype filter', remainingCards)

    // Legality
    if (filter.legalityFormat && filter.legalityValue) {
        remainingCards = remainingCards.filter(
            (card) =>
                card.legalities[filter.legalityFormat!] &&
                card.legalities[filter.legalityFormat!] === filter.legalityValue,
        )
    }
    console.log('After legality filter', remainingCards)

    // Sort
    const isDescending = sortDirection === SortDirection.DESC
    const colorToValue = (c: MTGA_Color): string => {
        switch (c) {
            case MTGA_Color.C:
                return 'A'
            case MTGA_Color.W:
                return 'B'
            case MTGA_Color.U:
                return 'C'
            case MTGA_Color.R:
                return 'D'
            case MTGA_Color.B:
                return 'E'
            case MTGA_Color.G:
                return 'F'
        }
    }
    const rarityToValue = (r: MTGA_Rarity): number => {
        switch (r) {
            case MTGA_Rarity.COMMON:
                return 0
            case MTGA_Rarity.UNCOMMON:
                return 1
            case MTGA_Rarity.RARE:
                return 2
            case MTGA_Rarity.MYTHIC:
                return 3
        }
    }
    const typeToValue = (t: string): number => {
        switch (t) {
            case 'Artifact':
                return 1
            case 'Basic':
                return 2
            case 'Battle':
                return 3
            case 'Creature':
                return 4
            case 'Enchantment':
                return 5
            case 'Instant':
                return 6
            case 'Kindred':
                return 7
            case 'Land':
                return 8
            case 'Legendary':
                return 9
            case 'Planeswalker':
                return 10
            case 'Snow':
                return 11
            case 'Sorcery':
                return 12
            default:
                return 0
        }
    }

    switch (sortBy) {
        case SortEnum.NAME:
            remainingCards = orderBy(
                remainingCards,
                [(c) => (c.name.startsWith('A-') ? c.name.slice(2) + '2' : c.name)],
                [isDescending ? 'desc' : 'asc'],
            )
            break
        case SortEnum.CMC:
            remainingCards = orderBy(remainingCards, [sortBy], [isDescending ? 'desc' : 'asc'])
            break
        case SortEnum.COLOR:
            remainingCards = orderBy(
                remainingCards,
                ['colorIdentity.length', (c) => c.colorIdentity.map(colorToValue).join('')],
                [isDescending ? 'desc' : 'asc'],
            )
            break
        case SortEnum.RARITY:
            remainingCards = orderBy(remainingCards, [(c) => rarityToValue(c.rarity)], [isDescending ? 'desc' : 'asc'])
            break
        case SortEnum.TYPE:
            remainingCards = orderBy(
                remainingCards,
                [
                    (c) => {
                        const types: Record<string, boolean> = {}
                        c.typeLine.split(' ').forEach((t) => (types[t] = true))

                        return Object.entries(types).reduce((acc, [type, isInIncluded]) => {
                            if (isInIncluded) {
                                acc += typeToValue(type)
                            }
                            return acc
                        }, 0)
                    },
                ],
                [isDescending ? 'desc' : 'asc'],
            )
            break
    }

    return remainingCards
}
