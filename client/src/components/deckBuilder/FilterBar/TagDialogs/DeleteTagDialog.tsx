import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../../graphql/types'

export interface DeleteTagDialogProps {
    open: boolean
    tag: MTG_Tag | null
    onClose: () => void
    onDeleted: (tagID: string) => void
}

export const DeleteTagDialog = ({ open, tag, onClose, onDeleted }: DeleteTagDialogProps) => {
    const [loading, setLoading] = useState(false)

    const handleClose = () => {
        onClose()
    }

    const handleDelete = async () => {
        if (!tag) return
        setLoading(true)
        try {
            await MTGFunctions.mutations.deleteMTGTagMutation({ tagID: tag.ID })
            onDeleted(tag.ID)
            handleClose()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open && !!tag} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Delete tag</DialogTitle>
            <DialogContent>
                <Typography>
                    Delete tag &quot;{tag?.name}&quot;? This will remove it from all cards and decks.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" color="error" onClick={() => void handleDelete()} disabled={loading}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    )
}
