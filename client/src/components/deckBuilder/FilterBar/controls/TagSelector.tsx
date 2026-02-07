import { Badge, Button, Chip, ClickAwayListener, Grid, Paper, Popper, TextField, Typography } from '@mui/material'
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { MTGFunctions } from '../../../../graphql/MTGA/functions'
import { MTG_Tag, TernaryBoolean } from '../../../../graphql/types'
import { isNegativeTB, isPositiveTB } from '../../../../types/ternaryBoolean'
import { TagChip } from '../../TagChip'
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
    const [search, setSearch] = useState('')
    const buttonRef = useRef<HTMLButtonElement>(null)

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        if (anchorEl) {
            setAnchorEl(null)
            setSearch('')
        } else {
            setAnchorEl(event.currentTarget)
        }
    }

    const handleClickAway = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
        // Don't close if clicking the button itself (it will toggle via handleClick)
        if (buttonRef.current?.contains(event.target as Node)) return
        setAnchorEl(null)
        setSearch('')
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

    const filteredTags = useMemo(() => {
        const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name))
        if (!search.trim()) return sorted
        const lowerSearch = search.toLowerCase()
        return sorted.filter((tag) => tag.name.toLowerCase().includes(lowerSearch))
    }, [tags, search])

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
                    <Button ref={buttonRef} onClick={handleClick}>Tags</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl} placement="bottom-start">
                <ClickAwayListener onClickAway={handleClickAway}>
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
                        <TextField
                            size="small"
                            placeholder="Search tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            fullWidth
                            sx={{ px: 2, py: 1 }}
                            autoFocus
                        />
                        {loading ? (
                            <Typography variant="body2" sx={{ p: 2 }}>
                                Loading...
                            </Typography>
                        ) : filteredTags.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {tags.length === 0 ? 'No tags yet. Create one in Manage tags.' : 'No tags match your search.'}
                            </Typography>
                        ) : (
                            filteredTags.map((tag) => (
                                <Grid item container key={tag.ID} xs={12} alignItems="center">
                                    <TernaryToggle
                                        value={selected[tag.ID] ?? TernaryBoolean.UNSET}
                                        type="textButton"
                                        textButtonProps={{
                                            onClick: () => onNext(tag.ID),
                                            onContextMenu: (e) => {
                                                e.preventDefault()
                                                onPrev(tag.ID)
                                            },
                                            children: (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <TagChip tag={tag} size="small" />
                                                    {tag.meta && (
                                                        <Chip
                                                            label="meta"
                                                            size="small"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.65rem',
                                                                backgroundColor: 'primary.main',
                                                                color: 'primary.contrastText',
                                                            }}
                                                        />
                                                    )}
                                                </span>
                                            ),
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
