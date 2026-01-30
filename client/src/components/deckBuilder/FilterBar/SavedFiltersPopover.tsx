import { Bookmark, Delete, Save } from '@mui/icons-material'
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useFilterPresets } from '../../../utils/hooks/useFilterPresets'

export const SavedFiltersPopover = () => {
    const { presets, savePreset, loadPreset, updatePreset, deletePreset, clearPresets, renamePreset, loading } =
        useFilterPresets()
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [presetName, setPresetName] = useState('')
    const [renameTarget, setRenameTarget] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const open = Boolean(anchorEl)

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setPresetName('')
        setRenameTarget(null)
        setRenameValue('')
    }

    const handleSave = async () => {
        const result = await savePreset(presetName)
        if (result.success) {
            setPresetName('')
            return
        }
        if (result.reason === 'no-deck') {
            alert('Necesitas guardar el mazo antes de crear presets de filtros.')
        }
    }

    const handleRename = async (presetId: string) => {
        if (renameTarget === presetId) {
            if (renameValue.trim()) {
                const success = await renamePreset(presetId, renameValue)
                if (!success) {
                    return
                }
            }
            setRenameTarget(null)
            setRenameValue('')
        } else {
            const preset = presets.find((p) => p.id === presetId)
            if (!preset) return
            setRenameTarget(presetId)
            setRenameValue(preset.name)
        }
    }

    const handleClear = async () => {
        await clearPresets()
    }

    return (
        <>
            <Tooltip title="Presets de filtros">
                <IconButton size="small" onClick={handleOpen} aria-label="Presets de filtros">
                    <Bookmark fontSize="small" />
                </IconButton>
            </Tooltip>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box sx={{ width: 360, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Filtros guardados
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                        <TextField
                            size="small"
                            label="Nombre del preset"
                            value={presetName}
                            onChange={(event) => setPresetName(event.target.value)}
                            fullWidth
                            disabled={loading}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSave}
                            disabled={!presetName.trim() || loading}
                        >
                            Guardar
                        </Button>
                    </Stack>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" py={3}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : presets.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No tienes presets guardados todavía.
                        </Typography>
                    ) : (
                        <List dense sx={{ maxHeight: 240, overflowY: 'auto' }}>
                            {presets.map((preset) => {
                                const isRenaming = renameTarget === preset.id
                                return (
                                    <ListItem key={preset.id} disableGutters>
                                        {isRenaming ? (
                                            <TextField
                                                size="small"
                                                value={renameValue}
                                                onChange={(event) => setRenameValue(event.target.value)}
                                                onKeyUp={(event) => {
                                                    if (event.key === 'Enter') {
                                                        void handleRename(preset.id)
                                                    }
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <ListItemText
                                                primary={preset.name}
                                                secondary={new Date(preset.savedAt).toLocaleString()}
                                                onClick={() => loadPreset(preset.id)}
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        )}
                                        <ListItemSecondaryAction>
                                            {isRenaming ? (
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" onClick={() => void handleRename(preset.id)}>
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        color="secondary"
                                                        onClick={() => {
                                                            setRenameTarget(null)
                                                            setRenameValue('')
                                                        }}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </Stack>
                                            ) : (
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Button size="small" onClick={() => loadPreset(preset.id)}>
                                                        Aplicar
                                                    </Button>
                                                    <Tooltip title="Guardar filtros actuales en este preset">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => void updatePreset(preset.id)}
                                                            aria-label="Actualizar preset"
                                                        >
                                                            <Save fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Button size="small" onClick={() => void handleRename(preset.id)}>
                                                        Renombrar
                                                    </Button>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => void deletePreset(preset.id)}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            )}
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                )
                            })}
                        </List>
                    )}
                    {presets.length > 0 && !loading && (
                        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                                {presets.length} presets guardados
                            </Typography>
                            <Button size="small" color="error" onClick={handleClear}>
                                Limpiar todos
                            </Button>
                        </Box>
                    )}
                </Box>
            </Popover>
        </>
    )
}
