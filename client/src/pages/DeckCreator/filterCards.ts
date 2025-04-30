import { cloneDeep, intersection, orderBy } from 'lodash'
import { CMCFilter, MTGFilterType, SortDirection, SortEnum } from '../../context/MTGA/Filter/MTGFilterContext'
import {
    MTG_Card,
    MTG_Color,
    MTG_DeckCard,
    MTG_Filter_Expansion,
    MTG_Game,
    MTG_Layout,
    MTG_Rarity,
} from '../../graphql/types'
import { isNegativeTB, isNotUnsetTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'

export const filterCards = <T extends MTG_Card>(
    cards: T[],
    filter: MTGFilterType,
    sort: { sortBy: SortEnum; sortDirection: SortDirection; enabled: boolean }[],
    selectingCommander?: boolean,
    commander?: MTG_DeckCard,
): MTG_Card[] => {
    let remainingCards = cloneDeep(cards)

    if (selectingCommander) {
        remainingCards = remainingCards.filter(
            (card) =>
                (card.typeLine.includes('//')
                    ? card.typeLine.split('//')[0].includes('Legendary')
                    : card.typeLine.includes('Legendary')) &&
                (card.typeLine.includes('Creature') || card.typeLine.includes('Planeswalker')),
        )
    }

    if (filter.searchString.length > 0) {
        const strings = filter.searchString.split(';')
        const getQueryForString = (s: string) => calculateQuery(s)
        const searchQueries = strings.map(getQueryForString)
        remainingCards = remainingCards.filter((card) => {
            for (const query of searchQueries) {
                switch (query.t) {
                    case 'CardType':
                        {
                            const fails = !card.typeLine.toLowerCase().includes(query.q.toLowerCase())
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'Rarity':
                        {
                            const allVersionsFail = card.versions.every((v) => v.rarity !== query.q)
                            if ((query.not && !allVersionsFail) || (!query.not && allVersionsFail)) {
                                return false
                            }
                        }
                        break
                    case 'CMC=':
                        {
                            const fails = card.CMC !== query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC>':
                        {
                            const fails = card.CMC <= query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC<':
                        {
                            const fails = card.CMC >= query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC>=':
                        {
                            const fails = card.CMC < query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC<=':
                        {
                            const fails = card.CMC > query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'Color':
                        {
                            const fails = intersection(card.colorIdentity, query.q).length === 0
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'Set':
                        {
                            const allVersionsFail = card.versions.every(
                                (v) =>
                                    v.set.toLowerCase() !== query.q.toLowerCase() &&
                                    v.setName.toLowerCase() !== query.q.toLowerCase(),
                            )
                            if ((query.not && !allVersionsFail) || (!query.not && allVersionsFail)) {
                                return false
                            }
                        }
                        break
                    case 'search': {
                        const cardNameChecks = card.name.toLowerCase().includes(query.q.toLowerCase())
                        const cardTypeLineChecks = card.typeLine.toLowerCase().includes(query.q.toLowerCase())
                        const cardSetNameChecks = card.versions.some((v) =>
                            v.setName.toLowerCase().includes(query.q.toLowerCase()),
                        )
                        const cardSetChecks = card.versions.some((v) =>
                            v.set.toLowerCase().includes(query.q.toLowerCase()),
                        )
                        const cardOracleChecks = card.oracleText?.toLowerCase().includes(query.q.toLowerCase()) || false
                        const cardFlavorChecks =
                            card.versions.some((v) => v.flavorText?.toLowerCase().includes(query.q.toLowerCase())) ||
                            false
                        let checks =
                            cardNameChecks ||
                            cardTypeLineChecks ||
                            cardSetNameChecks ||
                            cardSetChecks ||
                            cardOracleChecks ||
                            cardFlavorChecks
                        for (const v of card.versions) {
                            if (v.cardFaces) {
                                for (const cardFace of v.cardFaces) {
                                    const cardFaceNameChecks = cardFace.name
                                        .toLowerCase()
                                        .includes(query.q.toLowerCase())
                                    const cardFaceTypeLineChecks = cardFace.typeLine
                                        ?.toLowerCase()
                                        .includes(query.q.toLowerCase())
                                    const cardFaceOracleChecks = cardFace.oracleText
                                        ?.toLowerCase()
                                        .includes(query.q.toLowerCase())
                                    const cardFaceFlavorChecks =
                                        cardFace.flavorText?.toLowerCase().includes(query.q.toLowerCase()) || false
                                    checks =
                                        checks ||
                                        cardFaceNameChecks ||
                                        cardFaceTypeLineChecks ||
                                        cardFaceOracleChecks ||
                                        cardFaceFlavorChecks
                                }
                            }
                        }

                        if ((query.not && checks) || (!query.not && !checks)) {
                            return false
                        }
                    }
                }
            }
            return true
        })
    }

    // Color
    const colorEntries = Object.entries(filter.color).filter(([, value]) => isNotUnsetTB(value)) as [
        MTG_Color,
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

    // Commander color identity
    if (commander && !selectingCommander) {
        remainingCards = remainingCards.filter(
            (card) =>
                card.colorIdentity.every((c) => commander.card.colorIdentity.includes(c)) ||
                card.colorIdentity.length === 0 ||
                (card.colorIdentity.length === 1 && card.colorIdentity[0] === 'C'),
        )
    }

    // Rarity
    const rarityEntries = Object.entries(filter.rarity).filter(([, value]) => isNotUnsetTB(value)) as [
        MTG_Rarity,
        TernaryBoolean,
    ][]
    if (rarityEntries.length > 0) {
        if (rarityEntries.length === 1) {
            if (isPositiveTB(rarityEntries[0][1])) {
                remainingCards = remainingCards.filter((card) =>
                    card.versions.some((v) => v.rarity === rarityEntries[0][0]),
                )
            } else {
                remainingCards = remainingCards.filter(
                    (card) => !card.versions.some((v) => v.rarity === rarityEntries[0][0]),
                )
            }
        } else {
            const positiveRarities = rarityEntries.filter(([, value]) => isPositiveTB(value))
            const negativeRarities = rarityEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveRarities.length === rarityEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveRarities.some(([rarity]) => card.versions.some((v) => v.rarity === rarity)),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeRarities.length === rarityEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeRarities.every(([rarity]) => !card.versions.some((v) => v.rarity === rarity)),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveRarities.some(([rarity]) => card.versions.some((v) => v.rarity === rarity)) &&
                        negativeRarities.every(([rarity]) => !card.versions.some((v) => v.rarity === rarity)),
                )
            }
        }
    }

    // Mana Costs
    const manaCostEntries = Object.entries(filter.manaCosts).filter(([, value]) => isNotUnsetTB(value)) as [
        CMCFilter,
        TernaryBoolean,
    ][]
    if (manaCostEntries.length > 0) {
        if (manaCostEntries.length === 1) {
            const isInfinite = manaCostEntries[0][0] === 'infinite'
            if (isPositiveTB(manaCostEntries[0][1])) {
                remainingCards = remainingCards.filter((card) =>
                    isInfinite ? card.CMC > 9 : card.CMC === Number(manaCostEntries[0][0]),
                )
            } else {
                remainingCards = remainingCards.filter((card) =>
                    isInfinite ? card.CMC <= 9 : card.CMC !== Number(manaCostEntries[0][0]),
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
                        return isInfinite ? card.CMC > 9 : Number(manaCost) === card.CMC
                    }),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeManaCosts.length === manaCostEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeManaCosts.every(([manaCost]) => {
                        const isInfinite = manaCost === 'infinite'
                        return isInfinite ? card.CMC <= 9 : Number(manaCost) !== card.CMC
                    }),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveManaCosts.some(([manaCost]) => {
                            const isInfinite = manaCost === 'infinite'
                            return isInfinite ? card.CMC > 9 : Number(manaCost) === card.CMC
                        }) &&
                        negativeManaCosts.every(([manaCost]) => {
                            const isInfinite = manaCost === 'infinite'
                            return isInfinite ? card.CMC <= 9 : Number(manaCost) !== card.CMC
                        }),
                )
            }
        }
    }

    // Expansion
    const setEntries = Object.entries(filter.sets)
        .filter(([, value]) => isNotUnsetTB(value.value))
        .map(([key, value]) => {
            return [key.toLowerCase(), value.value] as [string, TernaryBoolean]
        })

    if (setEntries.length > 0) {
        if (setEntries.length === 1) {
            if (isPositiveTB(setEntries[0][1])) {
                remainingCards = remainingCards.filter((card) =>
                    card.versions.some((v) => v.set.toLowerCase() === setEntries[0][0]),
                )
            } else {
                remainingCards = remainingCards.filter(
                    (card) => !card.versions.some((v) => v.set.toLowerCase() === setEntries[0][0]),
                )
            }
        } else {
            const positiveSets = setEntries.filter(([, value]) => isPositiveTB(value))
            const negativeSets = setEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveSets.length === setEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveSets.some(([set]) => card.versions.some((v) => v.set.toLowerCase() === set)),
                )
            }
            // TODOS NEGATIVOS
            else if (negativeSets.length === setEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    negativeSets.every(([set]) => !card.versions.some((v) => v.set.toLowerCase() === set)),
                )
            }
            // MIXTO
            else {
                remainingCards = remainingCards.filter(
                    (card) =>
                        positiveSets.some(([set]) => card.versions.some((v) => v.set.toLowerCase() === set)) &&
                        negativeSets.every(([set]) => !card.versions.some((v) => v.set.toLowerCase() === set)),
                )
            }
        }
    }

    // Card Types
    const cardTypeEntries = Object.entries(filter.cardTypes).filter(([, value]) => isNotUnsetTB(value)) as [
        string,
        TernaryBoolean,
    ][]
    if (cardTypeEntries.length > 0) {
        if (cardTypeEntries.length === 1) {
            if (isPositiveTB(cardTypeEntries[0][1])) {
                remainingCards = remainingCards.filter((card) =>
                    card.typeLine.toLowerCase().includes(cardTypeEntries[0][0].toLowerCase()),
                )
            } else {
                remainingCards = remainingCards.filter(
                    (card) => !card.typeLine.toLowerCase().includes(cardTypeEntries[0][0].toLowerCase()),
                )
            }
        } else {
            const positiveCardTypes = cardTypeEntries.filter(([, value]) => isPositiveTB(value))
            const negativeCardTypes = cardTypeEntries.filter(([, value]) => isNegativeTB(value))
            // TODOS POSITIVOS
            if (positiveCardTypes.length === cardTypeEntries.length) {
                remainingCards = remainingCards.filter((card) =>
                    positiveCardTypes.every(([cardType]) => card.typeLine.includes(cardType)),
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
                        positiveCardTypes.every(([cardType]) => card.typeLine.includes(cardType)) &&
                        negativeCardTypes.every(([cardType]) => !card.typeLine.includes(cardType)),
                )
            }
        }
    }

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

    // Legality
    const legalityEntries = Object.entries(filter.legalities).filter(([, value]) =>
        Object.values(value).some((v) => isNotUnsetTB(v)),
    ) as [string, Record<string, TernaryBoolean>][]
    if (legalityEntries.length > 0) {
        for (const [format, legalityValues] of legalityEntries) {
            const positiveLegalityValues = Object.entries(legalityValues).filter(([, value]) => isPositiveTB(value))
            const negativeLegalityValues = Object.entries(legalityValues).filter(([, value]) => isNegativeTB(value))
            if (positiveLegalityValues.length > 0) {
                remainingCards = remainingCards.filter((card) =>
                    positiveLegalityValues.every(([legalityValue]) =>
                        card.versions.some((v) => v.legalities[format] === legalityValue),
                    ),
                )
            }
            if (negativeLegalityValues.length > 0) {
                remainingCards = remainingCards.filter((card) =>
                    negativeLegalityValues.every(
                        ([legalityValue]) => !card.versions.some((v) => v.legalities[format] === legalityValue),
                    ),
                )
            }
        }
    }

    // Layout
    const layoutEntries = Object.entries(filter.layouts).filter(([, value]) => isNotUnsetTB(value)) as [
        MTG_Layout,
        TernaryBoolean,
    ][]
    if (layoutEntries.length > 0) {
        const positiveLayouts = layoutEntries.filter(([, value]) => isPositiveTB(value)).map(([layout]) => layout)
        const negativeLayouts = layoutEntries.filter(([, value]) => isNegativeTB(value)).map(([layout]) => layout)

        if (positiveLayouts.length > 0) {
            remainingCards = remainingCards.filter((card) =>
                positiveLayouts.some(
                    (layout) =>
                        card.layout === layout ||
                        card.versions.some((v) => v.cardFaces && v.cardFaces.some((f) => f.layout === layout)),
                ),
            )
        }

        if (negativeLayouts.length > 0) {
            remainingCards = remainingCards.filter((card) =>
                negativeLayouts.every(
                    (layout) =>
                        card.layout !== layout &&
                        !card.versions.some((v) => v.cardFaces && v.cardFaces.some((f) => f.layout === layout)),
                ),
            )
        }
    }

    // Games
    const gameEntries = Object.entries(filter.games).filter(([, value]) => isNotUnsetTB(value)) as [
        MTG_Game,
        TernaryBoolean,
    ][]
    if (gameEntries.length > 0) {
        const positiveGames = gameEntries.filter(([, value]) => isPositiveTB(value)).map(([game]) => game)
        const negativeGames = gameEntries.filter(([, value]) => isNegativeTB(value)).map(([game]) => game)

        if (positiveGames.length > 0) {
            remainingCards = remainingCards.filter((card) =>
                positiveGames.some((game) => card.versions.some((v) => v.games.includes(game))),
            )
        }
        if (negativeGames.length > 0) {
            remainingCards = remainingCards.filter((card) =>
                negativeGames.every((game) => !card.versions.some((v) => v.games.includes(game))),
            )
        }
    }

    // Sort
    const colorToValue = (c: MTG_Color): string => {
        switch (c) {
            case MTG_Color.C:
                return 'A'
            case MTG_Color.W:
                return 'B'
            case MTG_Color.U:
                return 'C'
            case MTG_Color.R:
                return 'D'
            case MTG_Color.B:
                return 'E'
            case MTG_Color.G:
                return 'F'
        }
    }
    const rarityToValue = (r: MTG_Rarity): number => {
        switch (r) {
            case MTG_Rarity.common:
                return 0
            case MTG_Rarity.uncommon:
                return 1
            case MTG_Rarity.rare:
                return 2
            case MTG_Rarity.mythic:
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

    const expansions: MTG_Filter_Expansion[] = Object.entries(filter.sets).map(([set, value]) => ({
        imageURL: value.imageURL,
        releasedAt: value.releasedAt,
        set,
        setName: value.setName,
    }))

    remainingCards = orderBy(
        remainingCards,
        sort
            .filter((s) => s.enabled)
            .map((s) => {
                switch (s.sortBy) {
                    case SortEnum.NAME:
                        return (c: MTG_Card) => (c.name.startsWith('A-') ? c.name.slice(2) + '2' : c.name)
                    case SortEnum.CMC:
                        return (c: MTG_Card) => c.CMC
                    case SortEnum.COLOR:
                        return [
                            (c: MTG_Card) => (c.typeLine.includes('Land') && !c.typeLine.includes('//') ? 1 : -1),
                            'colorIdentity.length',
                            (c: MTG_Card) => c.colorIdentity.map(colorToValue).join(''),
                            (c: MTG_Card) => {
                                const isBasicLand = c.typeLine.includes('Basic Land') && !c.typeLine.includes('//')
                                return isBasicLand ? 0 : 1
                            },
                        ]
                    case SortEnum.RARITY:
                        return (c: MTG_Card) =>
                            rarityToValue(c.versions.find((v) => v.isDefault)?.rarity ?? MTG_Rarity.common)
                    case SortEnum.TYPE:
                        return (c: MTG_Card) => {
                            const types: Record<string, boolean> = {}
                            c.typeLine.split(' ').forEach((t) => (types[t] = true))
                            return Object.entries(types).reduce((acc, [type, isInIncluded]) => {
                                if (isInIncluded) {
                                    acc += typeToValue(type)
                                }
                                return acc
                            }, 0)
                        }
                    case SortEnum.SET:
                        return (c: MTG_Card) =>
                            expansions.find((e) => c.versions.some((v) => v.set.toLowerCase() === e.set.toLowerCase()))
                                ?.releasedAt
                    case SortEnum.RELEASED_AT:
                        // If sort direction is asc, return the earliest release date
                        // If sort direction is desc, return the latest release date
                        return (c: MTG_Card) =>
                            s.sortDirection === SortDirection.ASC
                                ? Math.min(...c.versions.map((v) => new Date(v.releasedAt).getTime()))
                                : Math.max(...c.versions.map((v) => new Date(v.releasedAt).getTime()))
                }
            })
            .flat(),
        sort.filter((s) => s.enabled).map((s) => (s.sortDirection === SortDirection.DESC ? 'desc' : 'asc')),
    )

    return remainingCards
}

const calculateQuery = (
    s: string,
):
    | {
          q: string
          t: 'CardType' | 'Rarity' | 'search' | 'Set'
          not: boolean
      }
    | {
          q: number
          t: 'CMC=' | 'CMC>' | 'CMC<' | 'CMC>=' | 'CMC<='
          not: boolean
      }
    | {
          q: MTG_Color[]
          t: 'Color'
          not: boolean
      } => {
    if (s.includes('set:')) {
        const q = s.split('set:')[1].trim()
        return {
            q: q.startsWith('!') ? q.substring(1) : q,
            t: 'Set',
            not: q.startsWith('!'),
        }
    }

    if (s.includes('t:')) {
        const q = s.split('t:')[1].trim()
        return {
            q: q.startsWith('!') ? q.substring(1) : q,
            t: 'CardType',
            not: q.startsWith('!'),
        }
    }

    if (s.includes('r:')) {
        const q = s.split('r:')[1].trim()
        return {
            q: convertToRarity(q.startsWith('!') ? q.substring(1) : q),
            t: 'Rarity',
            not: q.startsWith('!'),
        }
    }

    if (s.includes('c:')) {
        const q = s.split('c:')[1].trim()
        const colors: MTG_Color[] = []
        for (let i = 0; i < q.length; i++) {
            const c = q.charAt(i)
            const color = convertToColor(c)
            colors.push(color)
        }
        return {
            q: colors,
            t: 'Color',
            not: q.startsWith('!'),
        }
    }

    if (s.includes('cmc')) {
        if (s.includes('cmc:')) {
            const q = s.split('cmc:')[1].trim()
            return {
                q: Number(q.startsWith('!') ? q.substring(1) : q),
                t: 'CMC=',
                not: q.startsWith('!'),
            }
        }
        if (s.includes('cmc>=')) {
            const q = s.split('cmc>=')[1].trim()
            return {
                q: Number(q.startsWith('!') ? q.substring(1) : q),
                t: 'CMC>=',
                not: q.startsWith('!'),
            }
        }
        if (s.includes('cmc>')) {
            const q = s.split('cmc>')[1].trim()
            return {
                q: Number(q.startsWith('!') ? q.substring(1) : q),
                t: 'CMC>',
                not: q.startsWith('!'),
            }
        }
        if (s.includes('cmc<=')) {
            const q = s.split('cmc<=')[1].trim()
            return {
                q: Number(q.startsWith('!') ? q.substring(1) : q),
                t: 'CMC<=',
                not: q.startsWith('!'),
            }
        }
        if (s.includes('cmc<')) {
            const q = s.split('cmc<')[1].trim()
            return {
                q: Number(q.startsWith('!') ? q.substring(1) : q),
                t: 'CMC<',
                not: q.startsWith('!'),
            }
        }
    }

    const q = s.trim()
    return {
        q: q.startsWith('!') ? q.substring(1) : q,
        t: 'search',
        not: q.startsWith('!'),
    }
}

const convertToRarity = (r: string): MTG_Rarity => {
    switch (r) {
        case 'common':
        case 'c':
            return MTG_Rarity.common
        case 'uncommon':
        case 'u':
            return MTG_Rarity.uncommon
        case 'rare':
        case 'r':
            return MTG_Rarity.rare
        case 'mythic':
        case 'm':
            return MTG_Rarity.mythic
        default:
            return MTG_Rarity.common
    }
}

const convertToColor = (c: string): MTG_Color => {
    switch (c.toUpperCase()) {
        case 'W':
        case 'WHITE':
            return MTG_Color.W
        case 'U':
        case 'BLUE':
            return MTG_Color.U
        case 'B':
        case 'BLACK':
            return MTG_Color.B
        case 'R':
        case 'RED':
            return MTG_Color.R
        case 'G':
        case 'GREEN':
            return MTG_Color.G
        case 'C':
        case 'COLORLESS':
            return MTG_Color.C
        default:
            return MTG_Color.C
    }
}
