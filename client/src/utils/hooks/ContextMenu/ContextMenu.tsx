import { Check, ChevronRight } from '@mui/icons-material'
import { MenuItem, Paper, Popover } from '@mui/material'
import type React from 'react'
import { useState } from 'react'
import { NestedSubMenu } from './NestedSubMenu'
import { ContextMenuOption, ContextMenuProps } from './types'

export const ContextMenu = (props: ContextMenuProps) => {
    const { id, open, handleClose, options, handleClick, anchorRef } = props

    return (
        <Popover
            id={id}
            open={open}
            anchorEl={anchorRef.current}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
        >
            <Paper>
                {options.map((option, index) => (
                    <RenderMenuItem
                        key={option.label + index}
                        option={option}
                        index={index}
                        handleClose={handleClose}
                        handleClick={handleClick}
                        id={id}
                    />
                ))}
            </Paper>
        </Popover>
    )
}

type RenderMenuItemProps = {
    option: ContextMenuOption
    index: number
    handleClose: () => void
    handleClick: (callback: () => void, shouldKeepOpen?: boolean) => void
    id: string | undefined
}

const RenderMenuItem = (props: RenderMenuItemProps) => {
    const { option, index, handleClose, handleClick, id } = props

    const hasSubMenu = option.subMenu && option.subMenu.length > 0
    const selected = option.selected ?? false
    const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<HTMLElement | null>(null)

    const handleSubMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setSubMenuAnchorEl(event.currentTarget)
    }

    const handleSubMenuClose = () => {
        setSubMenuAnchorEl(null)
    }

    const handleSubMenuClick = (callback: () => void, shouldKeepOpen?: boolean) => {
        if (!shouldKeepOpen) {
            handleSubMenuClose()
        }
        if (!option.shouldKeepOpen) {
            handleClose()
        }
        callback()
    }

    return (
        <MenuItem
            key={option.label + index}
            onClick={(event) => {
                if (hasSubMenu) {
                    handleSubMenuOpen(event)
                } else if (option.action) {
                    handleClick(() => option.action!(id), option.shouldKeepOpen)
                }
            }}
            style={{ paddingLeft: `32px`, backgroundColor: selected ? 'lightgray' : 'inherit' }}
        >
            {option.label}
            {hasSubMenu && <ChevronRight style={{ marginLeft: 'auto' }} />}
            {selected && <Check style={{ marginLeft: 'auto', color: 'darkgreen' }} />}
            {hasSubMenu && subMenuAnchorEl !== null && (
                <NestedSubMenu
                    option={option}
                    anchorEl={subMenuAnchorEl}
                    onClose={handleSubMenuClose}
                    handleClick={handleSubMenuClick}
                    id={id}
                />
            )}
        </MenuItem>
    )
}
