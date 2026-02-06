import { Refresh } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_ImportPhase, MTG_ImportStatus } from '../../../graphql/types'

interface ReimportButtonProps {
    onImportComplete?: () => void
}

const phaseLabels: Record<MTG_ImportPhase, string> = {
    [MTG_ImportPhase.IDLE]: 'Idle',
    [MTG_ImportPhase.RESETTING_TIMERS]: 'Preparing...',
    [MTG_ImportPhase.FETCHING_SETS]: 'Fetching sets from Scryfall...',
    [MTG_ImportPhase.PROCESSING_SETS]: 'Processing sets...',
    [MTG_ImportPhase.FETCHING_CARDS]: 'Fetching cards from Scryfall...',
    [MTG_ImportPhase.PROCESSING_CARDS]: 'Processing cards...',
    [MTG_ImportPhase.REBUILDING_INDEX]: 'Rebuilding search index...',
    [MTG_ImportPhase.COMPLETE]: 'Import complete!',
    [MTG_ImportPhase.FAILED]: 'Import failed',
}

export const ReimportButton = ({ onImportComplete }: ReimportButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [status, setStatus] = useState<MTG_ImportStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [snackbar, setSnackbar] = useState<{
        open: boolean
        message: string
        severity: 'success' | 'error' | 'info'
    }>({ open: false, message: '', severity: 'info' })
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }, [])

    const fetchStatus = useCallback(async () => {
        try {
            const result = await MTGFunctions.queries.getMTGImportStatusQuery()
            setStatus(result)

            if (result.phase === MTG_ImportPhase.COMPLETE) {
                stopPolling()
                setSnackbar({
                    open: true,
                    message: 'Import completed successfully! Refreshing data...',
                    severity: 'success',
                })
                onImportComplete?.()
                setTimeout(() => setDialogOpen(false), 2000)
            } else if (result.phase === MTG_ImportPhase.FAILED) {
                stopPolling()
                setSnackbar({
                    open: true,
                    message: result.error || 'Import failed',
                    severity: 'error',
                })
            }
        } catch (err) {
            console.error('Failed to fetch import status:', err)
        }
    }, [stopPolling, onImportComplete])

    const startPolling = useCallback(() => {
        stopPolling()
        void fetchStatus()
        pollingRef.current = setInterval(() => void fetchStatus(), 2000)
    }, [fetchStatus, stopPolling])

    useEffect(() => {
        return () => stopPolling()
    }, [stopPolling])

    const handleReimport = async () => {
        setError(null)
        setDialogOpen(true)

        try {
            const result = await MTGFunctions.mutations.reimportMTGDataMutation()
            setStatus(result)

            if (result.started) {
                startPolling()
            } else if (result.inProgress) {
                // Already running, just start polling to show progress
                startPolling()
            } else {
                setError(result.message)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start import')
        }
    }

    const handleClose = () => {
        setDialogOpen(false)
        stopPolling()
    }

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }))
    }

    const isImporting = status?.inProgress && status.phase !== MTG_ImportPhase.COMPLETE

    return (
        <>
            <Tooltip title="Re-import cards and sets from Scryfall">
                <span>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => void handleReimport()}
                        startIcon={<Refresh />}
                        size="small"
                    >
                        Re-import Data
                    </Button>
                </span>
            </Tooltip>

            <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Import Cards & Sets</DialogTitle>
                <DialogContent>
                    {error ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    ) : status ? (
                        <Box sx={{ py: 2 }}>
                            <Typography variant="body1" gutterBottom>
                                {status.message || phaseLabels[status.phase]}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={status.progress}
                                        sx={{ height: 10, borderRadius: 5 }}
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 45 }}>
                                    {status.progress}%
                                </Typography>
                            </Box>
                            {status.phase === MTG_ImportPhase.COMPLETE && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    Import completed successfully!
                                </Alert>
                            )}
                            {status.phase === MTG_ImportPhase.FAILED && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {status.error || 'Import failed'}
                                </Alert>
                            )}
                            {isImporting && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                                    You can close this dialog. The import will continue in the background.
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Typography>Starting import...</Typography>
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    )
}
