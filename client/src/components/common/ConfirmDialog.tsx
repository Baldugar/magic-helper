import { Button, Dialog, DialogActions, DialogContent, DialogTitle, DialogProps } from '@mui/material'
import { ReactNode, useCallback, useEffect } from 'react'

export interface ConfirmDialogProps extends Omit<DialogProps, 'onClose' | 'title'> {
    title: ReactNode
    children: ReactNode
    onClose: () => void
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    confirmColor?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info' | 'inherit'
    confirmDisabled?: boolean
    loading?: boolean
}

export const ConfirmDialog = ({
    title,
    children,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'primary',
    confirmDisabled = false,
    loading = false,
    open,
    ...dialogProps
}: ConfirmDialogProps) => {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !confirmDisabled && !loading) {
                event.preventDefault()
                onConfirm()
            }
        },
        [onConfirm, confirmDisabled, loading],
    )

    useEffect(() => {
        if (open) {
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [open, handleKeyDown])

    return (
        <Dialog open={open} onClose={onClose} {...dialogProps}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{children}</DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{cancelText}</Button>
                <Button
                    variant="contained"
                    color={confirmColor}
                    onClick={onConfirm}
                    disabled={confirmDisabled || loading}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
