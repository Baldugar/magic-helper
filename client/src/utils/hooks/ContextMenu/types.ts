import type { MutableRefObject } from 'react'

export type ContextMenuProps = {
    id?: string
    open: boolean
    handleClose: () => void
    options: ContextMenuOption[]
    handleClick: (callback: () => void, shouldKeepOpen?: boolean) => void
    anchorRef: MutableRefObject<HTMLElement | null>
}

export type ContextMenuOption = {
    id?: string
    label: string
    action?: (id?: string) => void
    shouldKeepOpen?: boolean
    subMenu?: ContextMenuOption[]
    selected?: boolean
}
