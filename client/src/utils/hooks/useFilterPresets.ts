import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTG_Filter_SortBy, MTG_Filter_SortDirection } from '../../graphql/types'

type SortState = {
    sortBy: MTG_Filter_SortBy
    sortDirection: MTG_Filter_SortDirection
    enabled: boolean
}

export type FilterPreset = {
    id: string
    name: string
    savedAt: string
    page: number
    filter: ReturnType<typeof useMTGFilter>['filter']
    sort: SortState[]
}

const STORAGE_KEY = 'mtga_filter_presets'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const loadFromStorage = (): FilterPreset[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed as FilterPreset[]
    } catch (error) {
        console.warn('Failed to load filter presets from storage', error)
        return []
    }
}

const persistToStorage = (presets: FilterPreset[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

const createId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createPreset = (
    name: string,
    page: number,
    filter: FilterPreset['filter'],
    sort: FilterPreset['sort'],
): FilterPreset => ({
    id: createId(),
    name,
    savedAt: new Date().toISOString(),
    page,
    filter,
    sort,
})

export const useFilterPresets = () => {
    const { filter, setFilter, sort, setSort } = useMTGFilter()
    const [presets, setPresets] = useState<FilterPreset[]>(() => loadFromStorage())

    useEffect(() => {
        persistToStorage(presets)
    }, [presets])

    const savePreset = useCallback(
        (name: string) => {
            const trimmed = name.trim()
            if (!trimmed) return { success: false as const, reason: 'empty-name' as const }
            const preset = createPreset(trimmed, filter.page, clone(filter), clone(sort))
            setPresets((prev) => [preset, ...prev])
            return { success: true as const, preset }
        },
        [filter, sort],
    )

    const loadPreset = useCallback(
        (presetId: string) => {
            const preset = presets.find((p) => p.id === presetId)
            if (!preset) return false
            setFilter((prev) => ({ ...prev, ...clone(preset.filter), page: preset.page }))
            setSort(clone(preset.sort))
            return true
        },
        [presets, setFilter, setSort],
    )

    const deletePreset = useCallback((presetId: string) => {
        setPresets((prev) => prev.filter((preset) => preset.id !== presetId))
    }, [])

    const clearPresets = useCallback(() => {
        setPresets([])
    }, [])

    const renamePreset = useCallback((presetId: string, name: string) => {
        const trimmed = name.trim()
        if (!trimmed) return false
        setPresets((prev) =>
            prev.map((preset) =>
                preset.id === presetId
                    ? { ...preset, name: trimmed, savedAt: new Date().toISOString() }
                    : preset,
            ),
        )
        return true
    }, [])

    const sortedPresets = useMemo(
        () =>
            [...presets].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
        [presets],
    )

    return {
        presets: sortedPresets,
        savePreset,
        loadPreset,
        deletePreset,
        clearPresets,
        renamePreset,
    }
}
