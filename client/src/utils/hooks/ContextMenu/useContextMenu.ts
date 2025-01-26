import { useRef, useState } from 'react'

export const useContextMenu = <T extends HTMLElement>() => {
    const anchorRef = useRef<T | null>(null)
    const [open, setOpen] = useState(false)

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        setOpen(true)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const handleClick = (callback: () => void, shouldKeepOpen?: boolean) => {
        callback()
        if (!shouldKeepOpen) {
            handleClose()
        }
    }

    return { anchorRef, open, handleContextMenu, handleClick, handleClose }
}
