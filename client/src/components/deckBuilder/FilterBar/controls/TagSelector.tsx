import { Badge, Button, ClickAwayListener, Grid, Paper, Popper, Typography } from '@mui/material'
import { MouseEvent, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag, TernaryBoolean } from '../../../../graphql/types'
import { isNegativeTB, isPositiveTB } from '../../../../types/ternaryBoolean'
import { TernaryToggle } from './TernaryToggle'

export interface TagSelectorProps {
    selected: Record<string, TernaryBoolean>
    onNext: (tagID: string) => void
    onPrev: (tagID: string) => void
    onManageClick?: () => void
}

const TagSelector = (props: TagSelectorProps): JSX.Element => {
    const { selected, onNext, onPrev, onManageClick } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [tags, setTags] = useState<MTG_Tag[]>([])
    const [loading, setLoading] = useState(false)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    useEffect(() => {
        if (open) {
            setLoading(true)
            MTGFunctions.queries
                .getMTGTagsQuery()
                .then(setTags)
                .catch(() => setTags([]))
                .finally(() => setLoading(false))
        }
    }, [open])

    const howManyPositive = Object.values(selected).filter(isPositiveTB).length
    const howManyNegative = Object.values(selected).filter(isNegativeTB).length

    const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

    return (
        <Grid container item xs={'auto'}>
            <Badge
                badgeContent={howManyPositive}
                color="success"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Badge
                    badgeContent={howManyNegative}
                    color="error"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Button onClick={handleClick}>Tags</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl} placement="bottom-start">
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper sx={{ maxHeight: '70vh', overflow: 'auto', minWidth: 220 }}>
                        {onManageClick && (
                            <Button
                                size="small"
                                fullWidth
                                onClick={() => {
                                    onManageClick()
                                    setAnchorEl(null)
                                }}
                                sx={{ justifyContent: 'flex-start', px: 2, py: 1 }}
                            >
                                Manage tags
                            </Button>
                        )}
                        {loading ? (
                            <Typography variant="body2" sx={{ p: 2 }}>
                                Loading...
                            </Typography>
                        ) : sortedTags.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                No tags yet. Create one in Manage tags.
                            </Typography>
                        ) : (
                            sortedTags.map((tag) => (
                                <Grid item container key={tag.ID} xs={12}>
                                    <TernaryToggle
                                        value={selected[tag.ID] ?? TernaryBoolean.UNSET}
                                        type="textButton"
                                        textButtonProps={{
                                            onClick: () => onNext(tag.ID),
                                            onContextMenu: (e) => {
                                                e.preventDefault()
                                                onPrev(tag.ID)
                                            },
                                            children: tag.name,
                                        }}
                                    />
                                </Grid>
                            ))
                        )}
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default TagSelector
