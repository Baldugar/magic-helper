import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    TextField,
} from '@mui/material'
import { useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../../graphql/types'

export interface CreateTagDialogProps {
    open: boolean
    onClose: () => void
    onCreated: (tag: MTG_Tag) => void
}

export const CreateTagDialog = ({ open, onClose, onCreated }: CreateTagDialogProps) => {
    const [name, setName] = useState('')
    const [meta, setMeta] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleClose = () => {
        setName('')
        setMeta(false)
        setError(null)
        onClose()
    }

    const handleCreate = async () => {
        const trimmed = name.trim()
        if (!trimmed) {
            setError('Name is required')
            return
        }
        setError(null)
        setLoading(true)
        try {
            const tag = await MTGFunctions.mutations.createMTGTagMutation({ name: trimmed, meta })
            onCreated(tag)
            handleClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create tag')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Create tag</DialogTitle>
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
                    onKeyUp={(e) => e.key === 'Enter' && void handleCreate()}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={meta}
                            onChange={(e) => setMeta(e.target.checked)}
                        />
                    }
                    label="Meta tag"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={() => void handleCreate()} disabled={loading}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    )
}
