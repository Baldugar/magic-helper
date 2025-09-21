import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from '@mui/icons-material'
import { Box, Button, Checkbox, ClickAwayListener, FormControl, Grid, Paper, Popper } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { VList } from 'virtua'
import { useMTGTags } from '../../../../context/MTGA/Tags/useMTGTags'
import { CardTag, DeckTag, TernaryBoolean } from '../../../../graphql/types'
import TagPill from '../../../TagPill'

export interface TagSelectorProps {
    selected: { [key: string]: TernaryBoolean }
    onNext: (filterOption: string) => void
    onPrev: (filterOption: string) => void
}

export const TagSelector = (props: TagSelectorProps): JSX.Element => {
    const { selected, onNext, onPrev } = props
    const { cardTags, deckTags } = useMTGTags()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const renderTagSelectorItem = (tag: CardTag | DeckTag, value: TernaryBoolean) => {
        const indeterminate = value === TernaryBoolean.UNSET
        const checked = value === TernaryBoolean.TRUE
        return (
            <Box display={'flex'} alignItems={'flex-start'}>
                <FormControl
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onNext(tag.ID)
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onPrev(tag.ID)
                    }}
                >
                    <Checkbox
                        indeterminate={indeterminate}
                        checked={checked}
                        icon={<IndeterminateCheckBox />}
                        checkedIcon={<CheckBox />}
                        indeterminateIcon={<CheckBoxOutlineBlank />}
                    />
                </FormControl>
                <TagPill tag={tag} />
            </Box>
        )
    }

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Tags</Button>
            <Popper open={open} anchorEl={anchorEl} container={document.body}>
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper>
                        <VList style={{ height: 800 }}>
                            <Box>{cardTags.map((tag) => renderTagSelectorItem(tag, selected[tag.ID]))}</Box>
                            <Box>{deckTags.map((tag) => renderTagSelectorItem(tag, selected[tag.ID]))}</Box>
                        </VList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}
