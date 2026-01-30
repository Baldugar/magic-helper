import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../../graphql/types'

export interface EditTagDialogProps {
    open: boolean
    tag: MTG_Tag | null
    onClose: () => void
    onUpdated: (tag: MTG_Tag) => void
}

export const EditTagDialog = ({ open, tag, onClose, onUpdated }: EditTagDialogProps) => {
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (tag) {
            setName(tag.name)
            setError(null)
        }
    }, [tag])

    const handleClose = () => {
        setName('')
        setError(null)
        onClose()
    }

    const handleUpdate = async () => {
        if (!tag) return
        const trimmed = name.trim()
        if (!trimmed) {
            setError('Name cannot be empty')
            return
        }
        setError(null)
        setLoading(true)
        try {
            const updated = await MTGFunctions.mutations.updateMTGTagMutation({
                tagID: tag.ID,
                name: trimmed,
            })
            if (updated) {
                onUpdated(updated)
                handleClose()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update tag')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open && !!tag} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Edit tag</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Name"
                    fullWidth
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={!!error}
                    helperText={error}
                    onKeyUp={(e) => e.key === 'Enter' && void handleUpdate()}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={() => void handleUpdate()} disabled={loading}>
                    Update
                </Button>
            </DialogActions>
        </Dialog>
    )
}
