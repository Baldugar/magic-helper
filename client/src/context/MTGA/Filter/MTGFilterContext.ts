import { createContext, Dispatch, SetStateAction } from 'react'
import {
    MTG_Color,
    MTG_Filter_SortBy,
    MTG_Filter_SortDirection,
    MTG_Game,
    MTG_Layout,
    MTG_Rarity,
    QuerygetMTGCardsFilteredArgs,
    TernaryBoolean,
} from '../../../graphql/types'
import { PAGE_SIZE_DESKTOP } from '../../../utils/constants'

export type CMCFilter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'infinite'

export type SetFilter = {
    setName: string
    value: TernaryBoolean
    imageURL: string
    releasedAt: number
    setType: string
    games: MTG_Game[]
}
export interface MTGFilterType {
    searchString: string
    rarity: Record<MTG_Rarity, TernaryBoolean>
    color: Record<MTG_Color, TernaryBoolean>
    multiColor: TernaryBoolean
    manaCosts: Record<CMCFilter, TernaryBoolean>
    cardTypes: Record<string, TernaryBoolean>
    subtypes: Record<string, Record<string, TernaryBoolean>>
    sets: Record<string, SetFilter>
    legalities: Record<string, Record<string, TernaryBoolean>>
    layouts: Partial<Record<MTG_Layout, TernaryBoolean>>
    games: Record<MTG_Game, TernaryBoolean>
    hideIgnored: boolean
    tags: Record<string, TernaryBoolean>
    rating: {
        min: number | null
        max: number | null
    }
    deckID: string | null
    commander: string | null
    isSelectingCommander: boolean
    page: number
}

export interface MTGFilterContextType {
    filter: MTGFilterType
    originalFilter: MTGFilterType
    clearFilter: () => void
    setFilter: Dispatch<SetStateAction<MTGFilterType>>
    setOriginalFilter: Dispatch<SetStateAction<MTGFilterType>>
    sort: {
        sortBy: MTG_Filter_SortBy
        sortDirection: MTG_Filter_SortDirection
        enabled: boolean
    }[]
    setSort: Dispatch<
        SetStateAction<
            {
                sortBy: MTG_Filter_SortBy
                sortDirection: MTG_Filter_SortDirection
                enabled: boolean
            }[]
        >
    >

    zoom: 'IN' | 'OUT'
    setZoom: Dispatch<SetStateAction<'IN' | 'OUT'>>

    convertedFilters: QuerygetMTGCardsFilteredArgs
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
    tags: {},
    rating: {
        min: null,
        max: null,
    },
    deckID: null,
    commander: null,
    isSelectingCommander: false,
    page: 0,
}

export const initialConvertedFilter: QuerygetMTGCardsFilteredArgs = {
    filter: {
        cardTypes: [],
        color: [],
        manaCosts: [],
        games: [],
        hideIgnored: false,
        layouts: [],
        legalities: [],
        multiColor: TernaryBoolean.UNSET,
        rarity: [],
        rating: {
            min: null,
            max: null,
        },
        sets: [],
        subtypes: [],
        tags: [],
        searchString: '',
        isSelectingCommander: false,
    },
    pagination: {
        page: 0,
        pageSize: PAGE_SIZE_DESKTOP,
    },
    sort: [],
}

export const MTGFilterContext = createContext<MTGFilterContextType>({
    filter: initialMTGFilter,
    setFilter: () => {},
    clearFilter: () => {},
    originalFilter: initialMTGFilter,
    setOriginalFilter: () => {},
    sort: Object.values(MTG_Filter_SortBy).map((sortBy) => ({
        enabled: true,
        sortBy,
        sortDirection: MTG_Filter_SortDirection.ASC,
    })),
    setSort: () => {},
    zoom: 'OUT',
    setZoom: () => {},
    convertedFilters: {
        filter: {
            cardTypes: [],
            color: [],
            manaCosts: [],
            games: [],
            hideIgnored: false,
            layouts: [],
            legalities: [],
            multiColor: TernaryBoolean.UNSET,
            rarity: [],
            rating: {
                min: null,
                max: null,
            },
            sets: [],
            subtypes: [],
            tags: [],
            searchString: '',
            isSelectingCommander: false,
        },
        pagination: {
            page: 0,
            pageSize: PAGE_SIZE_DESKTOP,
        },
        sort: [],
    },
})
