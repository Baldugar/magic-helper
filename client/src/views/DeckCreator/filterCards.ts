import { cloneDeep, intersection, orderBy } from 'lodash'
import { CMCFilter, MTGAFilterType, SortDirection, SortEnum } from '../../context/MTGA/Filter/MTGAFilterContext'
import { MTGA_Card, MTGA_Color, MTGA_DeckCard, MTGA_Filter_Expansion, MTGA_Rarity } from '../../graphql/types'
import { isNegativeTB, isNotUnsetTB, isPositiveTB, TernaryBoolean } from '../../types/ternaryBoolean'

export const filterCards = <T extends MTGA_Card>(
    cards: T[],
    filter: MTGAFilterType,
    sort: { sortBy: SortEnum; sortDirection: SortDirection; enabled: boolean }[],
    selectingCommander?: boolean,
    commander?: MTGA_DeckCard,
): MTGA_Card[] => {
    let remainingCards = cloneDeep(cards)

    if (selectingCommander) {
        remainingCards = remainingCards.filter(
            (card) =>
                card.typeLine.includes('Legendary') &&
                (card.typeLine.includes('Creature') || card.typeLine.includes('Planeswalker')),
        )
    }

    if (filter.searchString.length > 0) {
        const strings = filter.searchString.split(';')
        const getQueryForString = (s: string) => calculateQuery(s, remainingCards)
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
                            const fails = card.rarity !== query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC=':
                        {
                            const fails = card.cmc !== query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC>':
                        {
                            const fails = card.cmc <= query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC<':
                        {
                            const fails = card.cmc >= query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC>=':
                        {
                            const fails = card.cmc < query.q
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'CMC<=':
                        {
                            const fails = card.cmc > query.q
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
                            const fails =
                                card.set.toLowerCase() !== query.q.toLowerCase() &&
                                card.setName.toLowerCase() !== query.q.toLowerCase()
                            if ((query.not && !fails) || (!query.not && fails)) {
                                return false
                            }
                        }
                        break
                    case 'search': {
                        const cardNameChecks = card.name.toLowerCase().includes(query.q.toLowerCase())
                        const cardTypeLineChecks = card.typeLine.toLowerCase().includes(query.q.toLowerCase())
                        const cardSetNameChecks = card.setName.toLowerCase().includes(query.q.toLowerCase())
                        const cardSetChecks = card.set.toLowerCase().includes(query.q.toLowerCase())
                        const cardOracleChecks =
                            card.description?.toLowerCase().includes(query.q.toLowerCase()) || false
                        const cardFlavorChecks = card.flavorText?.toLowerCase().includes(query.q.toLowerCase()) || false
                        let checks =
                            cardNameChecks ||
                            cardTypeLineChecks ||
                            cardSetNameChecks ||
                            cardSetChecks ||
                            cardOracleChecks ||
                            cardFlavorChecks
                        if (card.cardFaces) {
                            for (const cardFace of card.cardFaces) {
                                const cardFaceNameChecks = cardFace.name.toLowerCase().includes(query.q.toLowerCase())
                                const cardFaceTypeLineChecks = cardFace.typeLine
                                    .toLowerCase()
                                    .includes(query.q.toLowerCase())
                                const cardFaceOracleChecks = cardFace.description
                                    .toLowerCase()
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

    // Expansion
    const setEntries = Object.entries(filter.sets)
        .filter(([, value]) => isNotUnsetTB(value.value))
        .map(([key, value]) => {
            return [key.toLowerCase(), value.value] as [string, TernaryBoolean]
        })

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
    if (filter.legalityFormat && filter.legalityValue) {
        remainingCards = remainingCards.filter(
            (card) =>
                card.legalities[filter.legalityFormat!] &&
                card.legalities[filter.legalityFormat!] === filter.legalityValue,
        )
    }

    // Sort
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

    const expansions: MTGA_Filter_Expansion[] = Object.entries(filter.sets).map(([set, value]) => ({
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
                        return (c: MTGA_Card) => (c.name.startsWith('A-') ? c.name.slice(2) + '2' : c.name)
                    case SortEnum.CMC:
                        return (c: MTGA_Card) => c.cmc
                    case SortEnum.COLOR:
                        return ['colorIdentity.length', (c: MTGA_Card) => c.colorIdentity.map(colorToValue).join('')]
                    case SortEnum.RARITY:
                        return (c: MTGA_Card) => rarityToValue(c.rarity)
                    case SortEnum.TYPE:
                        return (c: MTGA_Card) => {
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
                        return (c: MTGA_Card) => expansions.find((e) => e.set.toLowerCase() === c.set)?.releasedAt
                    case SortEnum.RELEASED_AT:
                        return (c: MTGA_Card) => new Date(c.releasedAt).getTime()
                }
            })
            .flat(),
        sort.filter((s) => s.enabled).map((s) => (s.sortDirection === SortDirection.DESC ? 'desc' : 'asc')),
    )

    return remainingCards
}

const calculateQuery = (
    s: string,
    cards: MTGA_Card[],
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
          q: MTGA_Color[]
          t: 'Color'
          not: boolean
      } => {
    if (s.includes('set:')) {
        const q = s.split('set:')[1].trim()
        const sets = Array.from(new Set(cards.map((c) => [c.set.toLowerCase(), c.setName.toLowerCase()]).flat()))
        if (sets.filter((s) => s === q.toLowerCase().substring(q.startsWith('!') ? 1 : 0)).length > 0) {
            return {
                q: q.startsWith('!') ? q.substring(1) : q,
                t: 'Set',
                not: q.startsWith('!'),
            }
        } else {
            return {
                q: q.startsWith('!') ? q.substring(1) : q,
                t: 'Set',
                not: q.startsWith('!'),
            }
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
        const colors: MTGA_Color[] = []
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

const convertToRarity = (r: string): MTGA_Rarity => {
    switch (r) {
        case 'common':
        case 'c':
            return MTGA_Rarity.COMMON
        case 'uncommon':
        case 'u':
            return MTGA_Rarity.UNCOMMON
        case 'rare':
        case 'r':
            return MTGA_Rarity.RARE
        case 'mythic':
        case 'm':
            return MTGA_Rarity.MYTHIC
        default:
            return MTGA_Rarity.COMMON
    }
}

const convertToColor = (c: string): MTGA_Color => {
    switch (c.toUpperCase()) {
        case 'W':
        case 'WHITE':
            return MTGA_Color.W
        case 'U':
        case 'BLUE':
            return MTGA_Color.U
        case 'B':
        case 'BLACK':
            return MTGA_Color.B
        case 'R':
        case 'RED':
            return MTGA_Color.R
        case 'G':
        case 'GREEN':
            return MTGA_Color.G
        case 'C':
        case 'COLORLESS':
            return MTGA_Color.C
        default:
            return MTGA_Color.C
    }
}
