import { Add, Delete, Edit, LinkOutlined, LinkOff } from '@mui/icons-material'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../../graphql/types'
import { TagChip } from '../../TagChip'
import { CreateTagDialog } from './CreateTagDialog'
import { DeleteTagDialog } from './DeleteTagDialog'
import { EditTagDialog } from './EditTagDialog'

export interface ManageTagsDialogProps {
    open: boolean
    onClose: () => void
    /** Called when a tag is updated or deleted so parents can refetch cards (tags on cards change). */
    onTagsChanged?: () => void
}

export const ManageTagsDialog = ({ open, onClose, onTagsChanged }: ManageTagsDialogProps) => {
    const [tags, setTags] = useState<MTG_Tag[]>([])
    const [loading, setLoading] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [editTag, setEditTag] = useState<MTG_Tag | null>(null)
    const [deleteTag, setDeleteTag] = useState<MTG_Tag | null>(null)

    const loadTags = useCallback(() => {
        if (!open) return
        setLoading(true)
        MTGFunctions.queries
            .getMTGTagsQuery()
            .then(setTags)
            .catch(() => setTags([]))
            .finally(() => setLoading(false))
    }, [open])

    useEffect(() => {
        if (open) loadTags()
    }, [open, loadTags])

    const handleCreated = (tag: MTG_Tag) => {
        setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
        setCreateOpen(false)
    }

    const handleUpdated = (tag: MTG_Tag) => {
        setTags((prev) =>
            prev
                .map((t) => (t.ID === tag.ID ? tag : t))
                .sort((a, b) => a.name.localeCompare(b.name)),
        )
        setEditTag(null)
        onTagsChanged?.()
    }

    const handleDeleted = (tagID: string) => {
        setTags((prev) => prev.filter((t) => t.ID !== tagID))
        setDeleteTag(null)
        onTagsChanged?.()
    }

    const handleToggleMeta = async (tag: MTG_Tag) => {
        try {
            const updated = await MTGFunctions.mutations.updateMTGTagMutation({
                tagID: tag.ID,
                meta: !tag.meta,
            })
            if (updated) {
                setTags((prev) =>
                    prev
                        .map((t) => (t.ID === updated.ID ? updated : t))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                )
                onTagsChanged?.()
            }
        } catch {
            // Silently fail - could add error handling UI if needed
        }
    }

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Manage tags</DialogTitle>
                <DialogContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2" color="text.secondary">
                            Create, edit, or delete tags. Use the Tags filter to filter cards by tag.
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => setCreateOpen(true)}
                        >
                            Create tag
                        </Button>
                    </Box>
                    {loading ? (
                        <Typography variant="body2" color="text.secondary">
                            Loading...
                        </Typography>
                    ) : tags.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No tags yet. Create one to get started.
                        </Typography>
                    ) : (
                        <List dense>
                            {tags.map((tag) => (
                                <ListItem
                                    key={tag.ID}
                                    secondaryAction={
                                        <>
                                            <Tooltip title={tag.meta ? 'Remove meta status' : 'Make meta tag'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => void handleToggleMeta(tag)}
                                                    aria-label={`Toggle meta for ${tag.name}`}
                                                >
                                                    {tag.meta ? <LinkOutlined fontSize="small" color="primary" /> : <LinkOff fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            <IconButton
                                                size="small"
                                                onClick={() => setEditTag(tag)}
                                                aria-label={`Edit ${tag.name}`}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => setDeleteTag(tag)}
                                                aria-label={`Delete ${tag.name}`}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </>
                                    }
                                >
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <TagChip tag={tag} size="small" />
                                        {tag.meta && (
                                            <Chip
                                                label="meta"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
            </Dialog>
            <CreateTagDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />
            <EditTagDialog
                open={!!editTag}
                tag={editTag}
                onClose={() => setEditTag(null)}
                onUpdated={handleUpdated}
            />
            <DeleteTagDialog
                open={!!deleteTag}
                tag={deleteTag}
                onClose={() => setDeleteTag(null)}
                onDeleted={handleDeleted}
            />
        </>
    )
}
