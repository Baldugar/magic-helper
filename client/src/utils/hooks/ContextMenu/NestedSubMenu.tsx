import { Check } from '@mui/icons-material'
import { Box, Menu, MenuItem, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import { ContextMenuOption } from './types'

type NestedSubMenuProps = {
    option: ContextMenuOption
    anchorEl: HTMLElement | null
    onClose: () => void
    handleClick: (callback: () => void, shouldKeepOpen?: boolean) => void
    id?: string
}

export const NestedSubMenu = (props: NestedSubMenuProps) => {
    const { option, anchorEl, onClose, handleClick, id } = props
    const [search, setSearch] = useState('')

    const filteredSubMenu = useMemo(() => {
        if (!option.searchable || !search.trim()) return option.subMenu ?? []
        const lowerSearch = search.toLowerCase()
        return (option.subMenu ?? []).filter((item) => item.label.toLowerCase().includes(lowerSearch))
    }, [option.subMenu, option.searchable, search])

    const renderMenuItem = (subOption: ContextMenuOption, index: number) => {
        const selected = subOption.selected ?? false

        return (
            <MenuItem
                key={subOption.label + index}
                onClick={
                    subOption.action
                        ? () => {
                              handleClick(() => subOption.action!(id), subOption.shouldKeepOpen)
                          }
                        : undefined
                }
                style={{ paddingLeft: `32px`, backgroundColor: selected ? 'lightgray' : 'inherit' }}
            >
                {subOption.label}
                {selected && <Check style={{ marginLeft: 'auto', color: 'darkgreen' }} />}
            </MenuItem>
        )
    }

    return (
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={(event) => {
                // @ts-expect-error - TS doesn't know about stopPropagation
                if (event.stopPropagation) event.stopPropagation()
                setSearch('')
                onClose()
            }}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            MenuListProps={{
                sx: { maxHeight: 280, overflow: 'auto' },
            }}
        >
            {option.searchable && (
                <Box sx={{ px: 1, pb: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        fullWidth
                        autoFocus
                    />
                </Box>
            )}
            {filteredSubMenu.map(renderMenuItem)}
        </Menu>
    )
}
