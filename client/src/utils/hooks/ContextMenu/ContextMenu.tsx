import { Check, ChevronRight } from '@mui/icons-material'
import { ClickAwayListener, MenuItem, MenuList, Paper, Popover } from '@mui/material'
import type React from 'react'
import { useState } from 'react'
import { NestedSubMenu } from './NestedSubMenu'
import { ContextMenuOption, ContextMenuProps } from './types'

export const ContextMenu = (props: ContextMenuProps) => {
    const { id, open, handleClose, options, handleClick, anchorRef } = props
    const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<HTMLElement | null>(null)
    const [activeSubMenu, setActiveSubMenu] = useState<string | undefined>(undefined)

    const handleSubMenuOpen = (event: React.MouseEvent<HTMLElement>, option: ContextMenuOption) => {
        setSubMenuAnchorEl(event.currentTarget)
        setActiveSubMenu(option.id)
    }

    const handleSubMenuClose = () => {
        setSubMenuAnchorEl(null)
        setActiveSubMenu(undefined)
    }

    const renderMenuItem = (option: ContextMenuOption, depth = 0) => {
        const hasSubMenu = option.subMenu && option.subMenu.length > 0
        const selected = option.selected ?? false

        return (
            <MenuItem
                key={option.label}
                onClick={(event) => {
                    if (hasSubMenu) {
                        handleSubMenuOpen(event, option)
                    } else if (option.action) {
                        handleClick(() => option.action!(id), option.shouldKeepOpen)
                        if (!option.shouldKeepOpen) {
                            handleClose()
                        }
                    }
                }}
                style={{ paddingLeft: `${depth * 16 + 16}px`, backgroundColor: selected ? 'lightgray' : 'inherit' }}
            >
                {option.label}
                {hasSubMenu && <ChevronRight style={{ marginLeft: 'auto' }} />}
                {selected && <Check style={{ marginLeft: 'auto', color: 'darkgreen' }} />}
                {hasSubMenu && (
                    <NestedSubMenu
                        option={option}
                        anchorEl={subMenuAnchorEl}
                        onClose={handleSubMenuClose}
                        handleClick={handleClick}
                        id={id}
                        activeSubMenu={activeSubMenu}
                    />
                )}
            </MenuItem>
        )
    }

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
                <ClickAwayListener onClickAway={handleClose}>
                    <MenuList autoFocusItem={open}>{options.map((option) => renderMenuItem(option))}</MenuList>
                </ClickAwayListener>
            </Paper>
        </Popover>
    )
}
