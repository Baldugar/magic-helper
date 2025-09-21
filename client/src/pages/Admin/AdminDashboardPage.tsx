import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { AdminFunctions } from '../../graphql/Admin/functions'
import {
    AdminDashboard,
    AdminImportActionInput,
    AdminImportReport,
    AdminJob,
    AdminLegalitiesDiff,
} from '../../graphql/types'
import { useUser } from '../../context/User/useUser'

const ADMIN_ROLES = new Set(['ADMIN'])
const DEFAULT_LIMIT = 10

const formatTimestamp = (value?: number | null) => {
    if (!value) return '�'
    return new Date(value).toLocaleString()
}

const formatDuration = (value?: number | null) => {
    if (value === undefined || value === null) return '�'
    const seconds = Math.round(value / 1000)
    return `${seconds}s`
}

export const AdminDashboardPage = () => {
    const { user } = useUser()
    const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
    const [reports, setReports] = useState<Record<AdminJob, AdminImportReport[]>>({} as Record<AdminJob, AdminImportReport[]>)
    const [selectedDiff, setSelectedDiff] = useState<AdminLegalitiesDiff | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isAdmin = useMemo(() => {
        const roles = user?.roles ?? []
        return roles.some((role) => ADMIN_ROLES.has(role))
    }, [user])

    useEffect(() => {
        if (!isAdmin) return
        void loadDashboard()
    }, [isAdmin])

    const loadDashboard = async () => {
        try {
            setLoading(true)
            setError(null)
            const [dashboardData, cardsReports, setsReports] = await Promise.all([
                AdminFunctions.queries.getDashboard(),
                AdminFunctions.queries.getImportReports(AdminJob.MTG_CARDS, DEFAULT_LIMIT),
                AdminFunctions.queries.getImportReports(AdminJob.MTG_SETS, DEFAULT_LIMIT),
            ])
            if (dashboardData) {
                setDashboard(dashboardData)
                if (dashboardData.latestLegalitiesDiff) {
                    setSelectedDiff(dashboardData.latestLegalitiesDiff)
                }
            }
            setReports({
                [AdminJob.MTG_CARDS]: cardsReports ?? [],
                [AdminJob.MTG_SETS]: setsReports ?? [],
            } as Record<AdminJob, AdminImportReport[]>)
        } catch (err) {
            console.error(err)
            setError('No se pudo cargar el dashboard de administraci�n.')
        } finally {
            setLoading(false)
        }
    }

    const refreshJobReports = async (job: AdminJob) => {
        const jobReports = await AdminFunctions.queries.getImportReports(job, DEFAULT_LIMIT)
        setReports((prev) => ({
            ...prev,
            [job]: jobReports ?? [],
        }))
    }

    const handleViewDiff = async (importId: string) => {
        try {
            setLoading(true)
            const diff = await AdminFunctions.queries.getLegalitiesDiff(importId)
            if (diff) {
                setSelectedDiff(diff)
            }
        } catch (err) {
            console.error(err)
            setError('No se pudo cargar el diff de legalidades.')
        } finally {
            setLoading(false)
        }
    }

    const triggerImport = async (job: AdminJob, force: boolean) => {
        try {
            setLoading(true)
            setError(null)
            const input: AdminImportActionInput = { job, force }
            if (force) {
                await AdminFunctions.mutations.backfillImport(input)
            } else {
                await AdminFunctions.mutations.retryImport(input)
            }
            await loadDashboard()
            await refreshJobReports(job)
        } catch (err) {
            console.error(err)
            setError('No se pudo ejecutar la acci�n solicitada.')
        } finally {
            setLoading(false)
        }
    }

    if (!isAdmin) {
        return (
            <Box p={4} textAlign="center">
                <Typography variant="h5">No tienes permisos para acceder al �rea de administraci�n.</Typography>
            </Box>
        )
    }

    if (loading && !dashboard) {
        return (
            <Box p={6} display="flex" alignItems="center" justifyContent="center">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Stack spacing={4} p={4}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
                �rea de Administraci�n
            </Typography>
            {error ? (
                <Card>
                    <CardContent>
                        <Typography color="error">{error}</Typography>
                    </CardContent>
                </Card>
            ) : null}

            <Grid container spacing={3}>
                {dashboard?.imports.map((summary) => (
                    <Grid key={summary.jobName} item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Stack spacing={2}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6">{summary.jobName}</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => triggerImport(summary.jobName, false)}
                                            >
                                                Retry
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => triggerImport(summary.jobName, true)}
                                            >
                                                Backfill
                                            </Button>
                                        </Stack>
                                    </Box>
                                    <Divider />
                                    <Stack spacing={1}>
                                        <Typography variant="body2">
                                            �ltimo import: {formatTimestamp(summary.lastRun?.startedAt)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Registros procesados: {summary.lastRun?.recordsProcessed ?? '�'}
                                        </Typography>
                                        <Typography variant="body2">
                                            Duraci�n: {formatDuration(summary.lastRun?.durationMs)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Estado: {summary.lastRun?.status ?? '�'}
                                        </Typography>
                                    </Stack>
                                    <Divider />
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2">M�tricas de latencia</Typography>
                                        <Typography variant="body2">
                                            �ltima duraci�n: {formatDuration(summary.latency?.lastDurationMs)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Promedio: {formatDuration(summary.latency?.avgDurationMs)}
                                        </Typography>
                                        <Typography variant="body2">
                                            P50: {formatDuration(summary.latency?.p50DurationMs)}
                                        </Typography>
                                        <Typography variant="body2">
                                            P90: {formatDuration(summary.latency?.p90DurationMs)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Total de ejecuciones: {summary.latency?.totalRuns ?? 0}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Import History
                    </Typography>
                    {Object.entries(reports).map(([job, jobReports]) => (
                        <Box key={job} mb={3}>
                            <Typography variant="subtitle1" gutterBottom>
                                {job}
                            </Typography>
                            {jobReports.length === 0 ? (
                                <Stack spacing={1}>
                                    <Typography variant="body2">No hay ejecuciones registradas.</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="contained" onClick={() => triggerImport(job as AdminJob, false)}>
                                            Retry
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => triggerImport(job as AdminJob, true)}>
                                            Backfill
                                        </Button>
                                    </Stack>
                                </Stack>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Inicio</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell>Duraci�n</TableCell>
                                            <TableCell>Registros</TableCell>
                                            <TableCell>Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {jobReports.map((report) => (
                                            <TableRow key={report.id} hover>
                                                <TableCell>{formatTimestamp(report.startedAt)}</TableCell>
                                                <TableCell>{report.status}</TableCell>
                                                <TableCell>{formatDuration(report.durationMs)}</TableCell>
                                                <TableCell>{report.recordsProcessed ?? '�'}</TableCell>
                                                <TableCell>
                                                    <Button size="small" onClick={() => handleViewDiff(report.id)}>
                                                        Ver diff
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Box>
                    ))}
                </CardContent>
            </Card>

            {selectedDiff ? (
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Cambios de legalidades ({selectedDiff.entries.length})
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Carta</TableCell>
                                    <TableCell>Formato</TableCell>
                                    <TableCell>Anterior</TableCell>
                                    <TableCell>Actual</TableCell>
                                    <TableCell>Fecha</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedDiff.entries.map((entry) => (
                                    <TableRow key={`${entry.cardID}-${entry.format}`}>
                                        <TableCell>{entry.cardName}</TableCell>
                                        <TableCell>{entry.format}</TableCell>
                                        <TableCell>{entry.previousStatus ?? '�'}</TableCell>
                                        <TableCell>{entry.currentStatus ?? '�'}</TableCell>
                                        <TableCell>{formatTimestamp(entry.changedAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : null}
        </Stack>
    )
}

export default AdminDashboardPage
