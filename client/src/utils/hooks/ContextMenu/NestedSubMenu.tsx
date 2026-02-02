import { Check } from '@mui/icons-material'
import { Menu, MenuItem } from '@mui/material'
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
            {option.subMenu?.map(renderMenuItem)}
        </Menu>
    )
}
