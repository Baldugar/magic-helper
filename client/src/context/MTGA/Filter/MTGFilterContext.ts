import { createContext, Dispatch, SetStateAction } from 'react'
import { MTG_Color, MTG_Game, MTG_Layout, MTG_Rarity } from '../../../graphql/types'
import { TernaryBoolean } from '../../../types/ternaryBoolean'

export type CMCFilter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'infinite'

export interface MTGFilterType {
    searchString: string
    rarity: Record<MTG_Rarity, TernaryBoolean>
    color: Record<MTG_Color, TernaryBoolean>
    manaCosts: Record<CMCFilter, TernaryBoolean>
    cardTypes: Record<string, TernaryBoolean>
    multiColor: TernaryBoolean
    subtypes: Record<string, Record<string, TernaryBoolean>>
    sets: Record<string, { setName: string; value: TernaryBoolean; imageURL: string; releasedAt: number }>
    legalities: Record<string, Record<string, TernaryBoolean>>
    layouts: Partial<Record<MTG_Layout, TernaryBoolean>>
    games: Record<MTG_Game, TernaryBoolean>
    hideIgnored: boolean
}

export enum SortEnum {
    NAME = 'name',
    CMC = 'cmc',
    RARITY = 'rarity',
    COLOR = 'color',
    TYPE = 'type',
    SET = 'set',
    RELEASED_AT = 'releasedAt',
}

export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export interface MTGFilterContextType {
    filter: MTGFilterType
    originalFilter: MTGFilterType
    clearFilter: () => void
    setFilter: Dispatch<SetStateAction<MTGFilterType>>
    setOriginalFilter: Dispatch<SetStateAction<MTGFilterType>>
    sort: {
        sortBy: SortEnum
        sortDirection: SortDirection
        enabled: boolean
    }[]
    setSort: Dispatch<
        SetStateAction<
            {
                sortBy: SortEnum
                sortDirection: SortDirection
                enabled: boolean
            }[]
        >
    >
    zoom: 'IN' | 'OUT'
    setZoom: Dispatch<SetStateAction<'IN' | 'OUT'>>
}

export const initialMTGFilter: MTGFilterType = {
    searchString: '',
    cardTypes: {},
    color: {
        B: TernaryBoolean.UNSET,
        C: TernaryBoolean.UNSET,
        G: TernaryBoolean.UNSET,
        R: TernaryBoolean.UNSET,
        U: TernaryBoolean.UNSET,
        W: TernaryBoolean.UNSET,
    },
    sets: {},
    manaCosts: {
        '0': TernaryBoolean.UNSET,
        '1': TernaryBoolean.UNSET,
        '2': TernaryBoolean.UNSET,
        '3': TernaryBoolean.UNSET,
        '4': TernaryBoolean.UNSET,
        '5': TernaryBoolean.UNSET,
        '6': TernaryBoolean.UNSET,
        '7': TernaryBoolean.UNSET,
        '8': TernaryBoolean.UNSET,
        '9': TernaryBoolean.UNSET,
        infinite: TernaryBoolean.UNSET,
    },
    multiColor: TernaryBoolean.UNSET,
    rarity: {
        common: TernaryBoolean.UNSET,
        uncommon: TernaryBoolean.UNSET,
        rare: TernaryBoolean.UNSET,
        mythic: TernaryBoolean.UNSET,
    },
    subtypes: {},
    legalities: {},
    layouts: {},
    games: {
        arena: TernaryBoolean.UNSET,
        mtgo: TernaryBoolean.UNSET,
        paper: TernaryBoolean.UNSET,
    },
    hideIgnored: false,
}

export const MTGFilterContext = createContext<MTGFilterContextType>({
    filter: initialMTGFilter,
    setFilter: () => {},
    clearFilter: () => {},
    originalFilter: initialMTGFilter,
    setOriginalFilter: () => {},
    sort: Object.values(SortEnum).map((sortBy) => ({
        enabled: true,
        sortBy,
        sortDirection: SortDirection.ASC,
    })),
    setSort: () => {},
    zoom: 'OUT',
    setZoom: () => {},
})
