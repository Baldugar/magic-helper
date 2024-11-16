import { createContext, Dispatch, SetStateAction } from 'react'
import { MTGA_Color, MTGA_Rarity } from '../../../graphql/types'
import { TernaryBoolean } from '../../../types/ternaryBoolean'

export type CMCFilter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'infinite'

export interface MTGAFilterType {
    searchString: string
    rarity: Record<MTGA_Rarity, TernaryBoolean>
    color: Record<MTGA_Color, TernaryBoolean>
    manaCosts: Record<CMCFilter, TernaryBoolean>
    cardTypes: Record<string, TernaryBoolean>
    multiColor: TernaryBoolean
    subtypes: Record<string, Record<string, TernaryBoolean>>
    sets: Record<string, { setName: string; value: TernaryBoolean; imageURL: string; releasedAt: number }>
    legalityFormats: string[]
    legalityValues: string[]
    legalityFormat: string | null
    legalityValue: string | null
}

export enum SortEnum {
    NAME = 'name',
    CMC = 'cmc',
    RARITY = 'rarity',
    COLOR = 'color',
    TYPE = 'type',
    SET = 'set',
}

export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export interface MTGAFilterContextType {
    filter: MTGAFilterType
    originalFilter: MTGAFilterType
    setFilter: Dispatch<SetStateAction<MTGAFilterType>>
    setOriginalFilter: Dispatch<SetStateAction<MTGAFilterType>>
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

export const initialMTGAFilter: MTGAFilterType = {
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
        COMMON: TernaryBoolean.UNSET,
        MYTHIC: TernaryBoolean.UNSET,
        RARE: TernaryBoolean.UNSET,
        UNCOMMON: TernaryBoolean.UNSET,
    },
    subtypes: {},
    legalityFormat: null,
    legalityFormats: [],
    legalityValue: null,
    legalityValues: [],
}

export const MTGAFilterContext = createContext<MTGAFilterContextType>({
    filter: initialMTGAFilter,
    setFilter: () => {},
    originalFilter: initialMTGAFilter,
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
