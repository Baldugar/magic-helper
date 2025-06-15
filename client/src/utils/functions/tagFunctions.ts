import { MTG_Color } from '../../graphql/types'
import colors from '../colors'

const ORDER = 'WUBRG' as const // orden canónico

export type Pill = {
    background?: string
    gradient?: { left: string; center?: string; right: string }
    foreground: string
}

type OneColor = keyof typeof colors.cardPills.one_color
const monoKey: Record<MTG_Color, OneColor> = {
    [MTG_Color.W]: 'white',
    [MTG_Color.U]: 'blue',
    [MTG_Color.B]: 'black',
    [MTG_Color.R]: 'red',
    [MTG_Color.G]: 'green',
    [MTG_Color.C]: 'colorless',
}

type TwoColorName = Exclude<keyof typeof colors.cardPills.two_colors, 'foreground'>

export const GUILD_CODES = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'] as const
export type GuildCode = (typeof GUILD_CODES)[number]

export const guildKey: Record<GuildCode, TwoColorName> = {
    WU: 'azorius',
    WB: 'orzhov',
    WR: 'boros',
    WG: 'selesnya',
    UB: 'dimir',
    UR: 'izzet',
    UG: 'simic',
    BR: 'rakdos',
    BG: 'golgari',
    RG: 'gruul',
} as const

type ThreeColorName = Exclude<keyof typeof colors.cardPills.three_colors, 'foreground'>

export const WEDGE_CODES = ['WUG', 'WUB', 'UBR', 'BRG', 'RGW', 'WBG', 'URW', 'BUG', 'RWB', 'GUR'] as const
export type WedgeCode = (typeof WEDGE_CODES)[number]

export const clanKey: Record<WedgeCode, ThreeColorName> = {
    WUG: 'bant',
    WUB: 'esper',
    UBR: 'grixis',
    BRG: 'jund',
    RGW: 'naya',
    WBG: 'abzan',
    URW: 'jeskai',
    BUG: 'sultai',
    RWB: 'mardu',
    GUR: 'temur',
} as const

function sortKey(arr: MTG_Color[]): GuildCode | WedgeCode {
    return arr
        .map((c) => c.toString())
        .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
        .join('') as GuildCode | WedgeCode
}

function uniqueColors(src: MTG_Color[]): MTG_Color[] {
    return [...new Set(src.filter((c) => c !== MTG_Color.C))]
}

type RawGradient = { left: string; right: string; center?: string; foreground?: string }
type RawBackground = { background: string; foreground?: string }
type RawPill = RawGradient | RawBackground

function toPill(raw: RawPill, fallbackFg: string): Pill {
    if ('background' in raw) {
        return { background: raw.background, foreground: raw.foreground ?? fallbackFg }
    }
    const { left, right, center } = raw
    return { gradient: { left, right, ...(center && { center }) }, foreground: raw.foreground ?? fallbackFg }
}

export function calculateColor(c: MTG_Color[]): Pill {
    const unique = uniqueColors(c)
    const key = sortKey(unique)

    // 0 ⇒ sólo colorless
    if (unique.length === 0) {
        const pill = colors.cardPills.one_color.colorless
        return toPill(pill, pill.foreground)
    }

    // 1 ⇒ mono-color
    if (unique.length === 1) {
        const name = monoKey[unique[0]]
        const mono = colors.cardPills.one_color[name]
        return toPill(mono, mono.foreground)
    }

    // 2 ⇒ guild
    if (unique.length === 2) {
        const guild = colors.cardPills.two_colors[guildKey[key as GuildCode]]
        return toPill(guild, colors.cardPills.two_colors.foreground)
    }

    // 3 ⇒ shard / wedge
    if (unique.length === 3) {
        const clan = colors.cardPills.three_colors[clanKey[key as WedgeCode]]
        return toPill(clan, colors.cardPills.three_colors.foreground)
    }

    // 4-5 ⇒ fallback multicolor dorado
    return {
        background: colors.cardPills.multi_colors.background,
        foreground: colors.cardPills.multi_colors.foreground,
    }
}
