import { Check, ChevronRight } from '@mui/icons-material'
import { MenuItem, Paper, Popover, useMediaQuery } from '@mui/material'
import type React from 'react'
import { useState } from 'react'
import { NestedSubMenu } from './NestedSubMenu'
import { ContextMenuOption, ContextMenuProps } from './types'

export const ContextMenu = (props: ContextMenuProps) => {
    const { id, open, handleClose, options, handleClick, anchorRef, mobilePosition } = props
    const isMobile = useMediaQuery('(max-width:600px)')

    // Create a virtual anchor element for Popover if on mobile and mobilePosition is provided
    const virtualAnchor =
        isMobile && mobilePosition
            ? ({
                  getBoundingClientRect: () => ({
                      top: mobilePosition.y,
                      left: mobilePosition.x,
                      right: mobilePosition.x,
                      bottom: mobilePosition.y,
                      width: 0,
                      height: 0,
                      x: mobilePosition.x,
                      y: mobilePosition.y,
                      toJSON: () => {},
                  }),
                  nodeType: 1,
              } as unknown as Element)
            : anchorRef.current

    return (
        <Popover
            id={id}
            open={open}
            anchorEl={virtualAnchor}
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
