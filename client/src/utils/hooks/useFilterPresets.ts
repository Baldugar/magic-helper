import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMTGDeckCreator } from '../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../graphql/MTGA/functions'
import { MTG_FilterPreset } from '../../graphql/types'

type SortState = {
    sortBy: ReturnType<typeof useMTGFilter>['sort'][number]['sortBy']
    sortDirection: ReturnType<typeof useMTGFilter>['sort'][number]['sortDirection']
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

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const mapPresetFromGraph = (preset: MTG_FilterPreset): FilterPreset => ({
    id: preset.ID,
    name: preset.name,
    savedAt: preset.savedAt,
    page: preset.page,
    filter: preset.filter as unknown as FilterPreset['filter'],
    sort: preset.sort,
})

export const useFilterPresets = () => {
    const { filter, setFilter, sort, setSort } = useMTGFilter()
    const { deck } = useMTGDeckCreator()
    const deckID = deck?.ID ?? null

    const {
        queries: { getMTGFilterPresetsQuery },
        mutations: { createMTGFilterPresetMutation, updateMTGFilterPresetMutation, deleteMTGFilterPresetMutation },
    } = MTGFunctions

    const [presets, setPresets] = useState<FilterPreset[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let isActive = true
        if (!deckID) {
            setPresets([])
            return
        }

        setLoading(true)
        getMTGFilterPresetsQuery(deckID)
            .then((data) => {
                if (!isActive) return
                setPresets(data.map(mapPresetFromGraph))
            })
            .catch((error) => {
                console.warn('Failed to fetch MTG filter presets', error)
                if (isActive) setPresets([])
            })
            .finally(() => {
                if (isActive) setLoading(false)
            })

        return () => {
            isActive = false
        }
    }, [deckID, getMTGFilterPresetsQuery])

    const loadPreset = useCallback(
        (presetId: string) => {
            const preset = presets.find((p) => p.id === presetId)
            if (!preset) return false
            const clonedFilter = clone(preset.filter)
            setFilter((prev) => ({ ...prev, ...clonedFilter, page: preset.page }))
            setSort(clone(preset.sort))
            return true
        },
        [presets, setFilter, setSort],
    )

    const savePreset = useCallback(
        async (name: string) => {
            const trimmed = name.trim()
            if (!trimmed) return { success: false as const, reason: 'empty-name' as const }
            if (!deckID) return { success: false as const, reason: 'no-deck' as const }

            try {
                const serializedFilter = clone(filter) as unknown as Record<string, unknown>
                const created = await createMTGFilterPresetMutation({
                    deckID,
                    name: trimmed,
                    filter: serializedFilter,
                    sort: clone(sort).map((entry) => ({
                        enabled: entry.enabled,
                        sortBy: entry.sortBy,
                        sortDirection: entry.sortDirection,
                    })),
                    page: filter.page,
                })

                const mapped = mapPresetFromGraph(created)
                setPresets((prev) => [mapped, ...prev.filter((preset) => preset.id !== mapped.id)])
                return { success: true as const, preset: mapped }
            } catch (error) {
                console.warn('Failed to save filter preset', error)
                return { success: false as const, reason: 'error' as const }
            }
        },
        [createMTGFilterPresetMutation, deckID, filter, sort],
    )

    const deletePreset = useCallback(
        async (presetId: string) => {
            try {
                await deleteMTGFilterPresetMutation({ presetID: presetId })
                setPresets((prev) => prev.filter((preset) => preset.id !== presetId))
            } catch (error) {
                console.warn('Failed to delete filter preset', error)
            }
        },
        [deleteMTGFilterPresetMutation],
    )

    const clearPresets = useCallback(async () => {
        const ids = presets.map((preset) => preset.id)
        setPresets([])
        await Promise.all(
            ids.map((presetId) =>
                deleteMTGFilterPresetMutation({ presetID: presetId }).catch((error) => {
                    console.warn('Failed to delete filter preset', error)
                }),
            ),
        )
    }, [deleteMTGFilterPresetMutation, presets])

    const renamePreset = useCallback(
        async (presetId: string, name: string) => {
            const trimmed = name.trim()
            if (!trimmed) return false
            try {
                const updated = await updateMTGFilterPresetMutation({ presetID: presetId, name: trimmed })
                const mapped = mapPresetFromGraph(updated)
                setPresets((prev) => prev.map((preset) => (preset.id === mapped.id ? mapped : preset)))
                return true
            } catch (error) {
                console.warn('Failed to rename filter preset', error)
                return false
            }
        },
        [updateMTGFilterPresetMutation],
    )

    const sortedPresets = useMemo(
        () => [...presets].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
        [presets],
    )

    return {
        presets: sortedPresets,
        loading,
        savePreset,
        loadPreset,
        deletePreset,
        clearPresets,
        renamePreset,
    }
}
