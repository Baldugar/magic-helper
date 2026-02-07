import { Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { ReimportButton } from '../../components/deckBuilder/ReimportButton/ReimportButton'
import { DeckList } from './Components/DeckList/DeckList'

/**
 * Dashboard aggregates high-level entities: Decks and Card Packages.
 * It renders creation controls and lists for both domains.
 */
const Dashboard = () => {
    const [clearDialogOpen, setClearDialogOpen] = useState(false)
    const [clearing, setClearing] = useState(false)

    const handleClearUserData = async () => {
        setClearing(true)
        try {
            const response = await fetch('/api/dev/clear-user-data', {
                method: 'POST',
            })
            const data = await response.json()
            if (data.success) {
                window.location.reload()
            } else {
                alert(`Failed to clear user data: ${data.message}`)
            }
        } catch (error) {
            alert('Failed to clear user data')
        } finally {
            setClearing(false)
            setClearDialogOpen(false)
        }
    }

    return (
        <Stack padding={4} gap={2}>
            <Stack direction="row" justifyContent="flex-end" gap={2}>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setClearDialogOpen(true)}
                >
                    Clear User Data
                </Button>
                <ReimportButton />
            </Stack>
            <DeckList />
            <ConfirmDialog
                open={clearDialogOpen}
                onClose={() => setClearDialogOpen(false)}
                onConfirm={handleClearUserData}
                title="Clear All User Data"
                confirmText="Clear"
                confirmColor="error"
                loading={clearing}
            >
                <Typography>
                    This will permanently delete all decks, tags, filter presets, and card packages.
                    This action cannot be undone.
                </Typography>
            </ConfirmDialog>
        </Stack>
    )
}

export default Dashboard
