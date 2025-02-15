import { Check, ChevronRight } from '@mui/icons-material'
import { Menu, MenuItem } from '@mui/material'
import { ContextMenuOption } from './types'

type NestedSubMenuProps = {
    option: ContextMenuOption
    anchorEl: HTMLElement | null
    onClose: () => void
    handleClick: (callback: () => void, shouldKeepOpen?: boolean) => void
    id?: string
    activeSubMenu?: string
}

export const NestedSubMenu = (props: NestedSubMenuProps) => {
    const { option, anchorEl, onClose, handleClick, id, activeSubMenu } = props

    const renderMenuItem = (subOption: ContextMenuOption, depth = 1) => {
        const hasSubMenu = subOption.subMenu && subOption.subMenu.length > 0
        const selected = subOption.selected ?? false

        return (
            <MenuItem
                key={subOption.label}
                onClick={() => {
                    if (subOption.action) {
                        handleClick(() => subOption.action!(id), subOption.shouldKeepOpen)
                        if (!subOption.shouldKeepOpen) {
                            onClose()
                        }
                    }
                }}
                style={{ paddingLeft: `${depth * 16 + 16}px`, backgroundColor: selected ? 'lightgray' : 'inherit' }}
            >
                {subOption.label}
                {hasSubMenu && <ChevronRight style={{ marginLeft: 'auto' }} />}
                {selected && <Check style={{ marginLeft: 'auto', color: 'darkgreen' }} />}
                {hasSubMenu && activeSubMenu && activeSubMenu === subOption.id && (
                    <NestedSubMenu
                        option={subOption}
                        anchorEl={anchorEl}
                        onClose={onClose}
                        handleClick={handleClick}
                        id={id}
                    />
                )}
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
        >
            {option.subMenu?.map((subOption) => renderMenuItem(subOption))}
        </Menu>
    )
}
