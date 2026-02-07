import { useMediaQuery } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMTGDeckCreatorLogic } from '../../context/MTGA/DeckCreator/Logic/useMTGDeckCreatorLogic'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTGFunctions } from '../../graphql/MTGA/functions'
import { MTG_FilterPreset } from '../../graphql/types'
import { PAGE_SIZE_MOBILE } from '../constants'

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
    filter: preset.filterState as unknown as FilterPreset['filter'],
    sort: preset.sortState,
})

export const useFilterPresets = () => {
    const { filter, setFilter, sort, setSort, getVisibleCardIndex, setScrollToCardIndexAfterLoad, activePresetId, setActivePresetId } = useMTGFilter()
    const { deck } = useMTGDeckCreatorLogic()
    const deckID = deck?.ID ?? null
    const isMobile = useMediaQuery('(max-width: 600px)')

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

            // Calculate the correct page for the current device's page size
            // The preset stores the page and pageSize from when it was saved
            const savedPageSize = preset.filter.pageSize
            const savedPage = preset.page

            // Get the saved card offset within page (if saved on mobile)
            const savedCardOffset = (clonedFilter as unknown as Record<string, unknown>).mobileCardOffset as
                | number
                | undefined

            // Calculate absolute card index (including offset if available)
            const firstCardIndex = savedPage * savedPageSize + (savedCardOffset ?? 0)

            // On mobile we use PAGE_SIZE_MOBILE, on desktop we use the saved pageSize
            const currentPageSize = isMobile ? PAGE_SIZE_MOBILE : savedPageSize
            const adjustedPage = Math.floor(firstCardIndex / currentPageSize)

            // On mobile, also calculate which card within the page to scroll to
            if (isMobile) {
                const cardIndexInPage = firstCardIndex % currentPageSize
                setScrollToCardIndexAfterLoad(cardIndexInPage)
            }

            setFilter((prev) => ({ ...prev, ...clonedFilter, page: adjustedPage }))
            setSort(clone(preset.sort))
            return true
        },
        [presets, setFilter, setSort, isMobile, setScrollToCardIndexAfterLoad],
    )

    const savePreset = useCallback(
        async (name: string) => {
            const trimmed = name.trim()
            if (!trimmed) return { success: false as const, reason: 'empty-name' as const }
            if (!deckID) return { success: false as const, reason: 'no-deck' as const }

            try {
                const serializedFilter = clone(filter) as unknown as Record<string, unknown>

                // On mobile, store the actual page size and visible card offset for precise restoration
                if (isMobile) {
                    serializedFilter.pageSize = PAGE_SIZE_MOBILE
                    serializedFilter.mobileCardOffset = getVisibleCardIndex()
                }

                const created = await createMTGFilterPresetMutation({
                    deckID,
                    name: trimmed,
                    filterState: serializedFilter,
                    sortState: clone(sort).map((entry) => ({
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
        [createMTGFilterPresetMutation, deckID, filter, sort, isMobile, getVisibleCardIndex],
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

    const updatePreset = useCallback(
        async (presetId: string) => {
            try {
                const serializedFilter = clone(filter) as unknown as Record<string, unknown>

                // On mobile, store the actual page size and visible card offset for precise restoration
                if (isMobile) {
                    serializedFilter.pageSize = PAGE_SIZE_MOBILE
                    serializedFilter.mobileCardOffset = getVisibleCardIndex()
                }

                const updated = await updateMTGFilterPresetMutation({
                    presetID: presetId,
                    filterState: serializedFilter,
                    sortState: clone(sort).map((entry) => ({
                        enabled: entry.enabled,
                        sortBy: entry.sortBy,
                        sortDirection: entry.sortDirection,
                    })),
                    page: filter.page,
                })
                const mapped = mapPresetFromGraph(updated)
                setPresets((prev) => prev.map((preset) => (preset.id === mapped.id ? mapped : preset)))
                return true
            } catch (error) {
                console.warn('Failed to update filter preset', error)
                return false
            }
        },
        [updateMTGFilterPresetMutation, filter, sort, isMobile, getVisibleCardIndex],
    )

    const sortedPresets = useMemo(
        () => [...presets].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
        [presets],
    )

    // Track last saved state to avoid saving on initial load or when nothing changed
    const lastSavedStateRef = useRef<string | null>(null)

    const setActivePreset = useCallback(
        (presetId: string) => {
            // Store current filter/sort state as the "last saved" to avoid immediate autosave
            lastSavedStateRef.current = JSON.stringify({ filter, sort })
            setActivePresetId(presetId)
        },
        [filter, sort, setActivePresetId],
    )

    const clearActivePreset = useCallback(() => {
        setActivePresetId(null)
        lastSavedStateRef.current = null
    }, [setActivePresetId])

    // Autosave effect - debounced save to active preset when filter/sort changes
    useEffect(() => {
        if (!activePresetId) return

        const currentState = JSON.stringify({ filter, sort })

        // Don't save if nothing changed
        if (currentState === lastSavedStateRef.current) return

        const timeout = setTimeout(() => {
            // Double-check the preset still exists
            const presetExists = presets.some((p) => p.id === activePresetId)
            if (!presetExists) {
                setActivePresetId(null)
                return
            }

            const serializedFilter = clone(filter) as unknown as Record<string, unknown>

            // On mobile, store the actual page size and visible card offset for precise restoration
            if (isMobile) {
                serializedFilter.pageSize = PAGE_SIZE_MOBILE
                serializedFilter.mobileCardOffset = getVisibleCardIndex()
            }

            updateMTGFilterPresetMutation({
                presetID: activePresetId,
                filterState: serializedFilter,
                sortState: clone(sort).map((entry) => ({
                    enabled: entry.enabled,
                    sortBy: entry.sortBy,
                    sortDirection: entry.sortDirection,
                })),
                page: filter.page,
            })
                .then((updated) => {
                    const mapped = mapPresetFromGraph(updated)
                    setPresets((prev) => prev.map((preset) => (preset.id === mapped.id ? mapped : preset)))
                    lastSavedStateRef.current = currentState
                })
                .catch((error) => {
                    console.warn('Failed to autosave filter preset', error)
                })
        }, 1500) // 1.5 second debounce

        return () => clearTimeout(timeout)
    }, [activePresetId, filter, sort, presets, isMobile, getVisibleCardIndex, updateMTGFilterPresetMutation, setActivePresetId])

    // Clear active preset if it gets deleted
    useEffect(() => {
        if (activePresetId && !presets.some((p) => p.id === activePresetId)) {
            setActivePresetId(null)
        }
    }, [activePresetId, presets, setActivePresetId])

    return {
        presets: sortedPresets,
        loading,
        savePreset,
        loadPreset,
        updatePreset,
        deletePreset,
        clearPresets,
        renamePreset,
        activePresetId,
        setActivePreset,
        clearActivePreset,
    }
}
