import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    TextField,
    Typography,
} from '@mui/material'
import { Add, ArrowForward, Clear } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../../graphql/types'
import { TagChip } from '../../TagChip'

export interface ChainBuilderDialogProps {
    open: boolean
    onClose: () => void
    cardID: string
    cardName: string
    onAssigned: () => void
}

export const ChainBuilderDialog = ({
    open,
    onClose,
    cardID,
    cardName,
    onAssigned,
}: ChainBuilderDialogProps): JSX.Element => {
    const [tags, setTags] = useState<MTG_Tag[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [search, setSearch] = useState('')

    // Chain building state
    const [chainTagIDs, setChainTagIDs] = useState<string[]>([]) // Meta tags in order
    const [terminalTagID, setTerminalTagID] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setLoading(true)
            setChainTagIDs([])
            setTerminalTagID(null)
            setSearch('')
            MTGFunctions.queries
                .getMTGTagsQuery()
                .then(setTags)
                .catch(() => setTags([]))
                .finally(() => setLoading(false))
        }
    }, [open])

    const lowerSearch = search.toLowerCase().trim()

    const metaTags = useMemo(() => {
        const meta = tags.filter((t) => t.meta)
        if (!lowerSearch) return meta
        return meta.filter((t) => t.name.toLowerCase().includes(lowerSearch))
    }, [tags, lowerSearch])

    const allTags = useMemo(() => {
        const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name))
        if (!lowerSearch) return sorted
        return sorted.filter((t) => t.name.toLowerCase().includes(lowerSearch))
    }, [tags, lowerSearch])

    const getTagById = (id: string) => tags.find((t) => t.ID === id)

    const handleAddToChain = (tagID: string) => {
        setChainTagIDs([...chainTagIDs, tagID])
    }

    const handleRemoveLastFromChain = () => {
        if (terminalTagID) {
            setTerminalTagID(null)
        } else {
            setChainTagIDs(chainTagIDs.slice(0, -1))
        }
    }

    const handleSelectTerminal = (tagID: string) => {
        setTerminalTagID(tagID)
    }

    const handleClearAll = () => {
        setChainTagIDs([])
        setTerminalTagID(null)
    }

    const handleSubmit = async () => {
        if (!terminalTagID) return

        setSubmitting(true)
        try {
            await MTGFunctions.mutations.assignTagToCardMutation({
                cardID,
                tagID: terminalTagID,
                chain: chainTagIDs.length > 0 ? chainTagIDs : undefined,
            })
            onAssigned()
            onClose()
        } catch (error) {
            console.error('Failed to assign tag chain:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const canSubmit = terminalTagID !== null

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Assign Tag Chain to "{cardName}"</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Typography>Loading tags...</Typography>
                ) : (
                    <>
                        {/* Instructions */}
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Build a chain by adding meta tags in order, then select a terminal tag to
                            complete. You can also just select a terminal tag for a simple assignment.
                        </Typography>

                        <TextField
                            size="small"
                            placeholder="Search tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            fullWidth
                            sx={{ my: 1 }}
                        />

                        {/* Current chain preview */}
                        <Box
                            sx={{
                                p: 2,
                                my: 2,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                minHeight: 60,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                Chain Preview:
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                {chainTagIDs.length === 0 && !terminalTagID ? (
                                    <Typography variant="body2" color="text.secondary">
                                        (empty - select tags below)
                                    </Typography>
                                ) : (
                                    <>
                                        {chainTagIDs.map((id, i) => {
                                            const tag = getTagById(id)
                                            return (
                                                <Box key={i} display="flex" alignItems="center">
                                                    {tag && <TagChip tag={tag} size="small" />}
                                                    <ArrowForward sx={{ fontSize: 16, mx: 0.5, color: 'text.secondary' }} />
                                                </Box>
                                            )
                                        })}
                                        {terminalTagID ? (
                                            <TagChip tag={getTagById(terminalTagID)!} size="small" />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                ?
                                            </Typography>
                                        )}
                                    </>
                                )}
                                {(chainTagIDs.length > 0 || terminalTagID) && (
                                    <IconButton size="small" onClick={handleRemoveLastFromChain} title="Remove last">
                                        <Clear sx={{ fontSize: 16 }} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Step 1: Meta tags */}
                        <Typography variant="subtitle2" gutterBottom>
                            Step 1: Add Meta Tags (optional)
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                            {metaTags.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No meta tags available. Create them in Manage Tags.
                                </Typography>
                            ) : (
                                metaTags.map((tag) => (
                                    <Chip
                                        key={tag.ID}
                                        label={tag.name}
                                        size="small"
                                        icon={<Add sx={{ fontSize: 14 }} />}
                                        onClick={() => handleAddToChain(tag.ID)}
                                        disabled={terminalTagID !== null}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))
                            )}
                        </Box>

                        {/* Step 2: Terminal tag */}
                        <Typography variant="subtitle2" gutterBottom>
                            Step 2: Select Terminal Tag {chainTagIDs.length === 0 && '(or just pick a tag)'}
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                            {allTags.map((tag) => (
                                <Chip
                                    key={tag.ID}
                                    label={tag.name}
                                    size="small"
                                    color={terminalTagID === tag.ID ? 'primary' : tag.meta ? 'secondary' : 'default'}
                                    variant={terminalTagID === tag.ID ? 'filled' : 'outlined'}
                                    onClick={() => handleSelectTerminal(tag.ID)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClearAll} disabled={chainTagIDs.length === 0 && !terminalTagID}>
                    Clear
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit || submitting}>
                    {submitting ? 'Assigning...' : 'Assign Chain'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
