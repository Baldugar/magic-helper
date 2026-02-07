import { Typography } from '@mui/material'
import { useState } from 'react'
import { ConfirmDialog } from '../../../common/ConfirmDialog'
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

    const handleDelete = async () => {
        if (!tag) return
        setLoading(true)
        try {
            await MTGFunctions.mutations.deleteMTGTagMutation({ tagID: tag.ID })
            onDeleted(tag.ID)
            onClose()
        } finally {
            setLoading(false)
        }
    }

    return (
        <ConfirmDialog
            open={open && !!tag}
            onClose={onClose}
            onConfirm={() => void handleDelete()}
            title="Delete tag"
            confirmText="Delete"
            confirmColor="error"
            loading={loading}
            maxWidth="xs"
            fullWidth
        >
            <Typography>
                Delete tag &quot;{tag?.name}&quot;? This will remove it from all cards and decks.
            </Typography>
        </ConfirmDialog>
    )
}
