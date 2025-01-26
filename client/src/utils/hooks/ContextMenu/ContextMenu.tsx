import { ClickAwayListener, Grow, MenuItem, MenuList, Paper, Popper } from '@mui/material'
import { MutableRefObject } from 'react'

export type ContextMenuProps = {
    id?: string
    open: boolean
    handleClose: () => void
    options: ContextMenuOption[]
    handleClick: (callback: () => void) => void
    anchorRef: MutableRefObject<HTMLElement | null>
}

export type ContextMenuOption = {
    label: string
    action: (id?: string) => void
}

export const ContextMenu = (props: ContextMenuProps) => {
    const { id, open, handleClose, options, handleClick, anchorRef } = props

    return (
        <Popper id={id} open={open} anchorEl={anchorRef.current} placement={'bottom-start'} transition disablePortal>
            {({ TransitionProps, placement }) => (
                <Grow
                    {...TransitionProps}
                    style={{
                        transformOrigin: placement === 'bottom-start' ? 'left top' : 'left bottom',
                    }}
                >
                    <Paper>
                        <ClickAwayListener onClickAway={handleClose}>
                            <MenuList autoFocusItem={open}>
                                {options.map((option, index) => (
                                    <MenuItem key={index} onClick={() => handleClick(option.action)}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </ClickAwayListener>
                    </Paper>
                </Grow>
            )}
        </Popper>
    )
}
