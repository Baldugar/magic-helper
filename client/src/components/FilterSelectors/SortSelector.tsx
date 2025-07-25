import { DragDropContext, Draggable, Droppable, OnDragEndResponder } from '@hello-pangea/dnd'
import { ArrowDownward, ArrowUpward } from '@mui/icons-material'
import { Box, Button, Checkbox, ClickAwayListener, Grid, IconButton, Paper, Popper, Typography } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMTGFilter } from '../../context/MTGA/Filter/useMTGFilter'
import { MTG_Filter_SortDirection } from '../../graphql/types'

function DraggablePortalWrapper({ children, isDragging }: { children: React.ReactNode; isDragging: boolean }) {
    return isDragging
        ? createPortal(children, document.body) // Move the element to the body so it can be on top of everything
        : children
}

export const SortSelector = () => {
    const { sort, setSort } = useMTGFilter()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const open = Boolean(anchorEl)

    const handleDragEnd: OnDragEndResponder = (result) => {
        if (!result.destination) {
            return
        }

        const newSort = [...sort]
        const [removed] = newSort.splice(result.source.index, 1)
        newSort.splice(result.destination.index, 0, removed)
        setSort(newSort)
    }

    const handleChangeSortDirection = (index: number, direction: MTG_Filter_SortDirection) => {
        setSort((prevSort) => {
            return prevSort.map((sortOption, i) => {
                if (i === index) {
                    return {
                        ...sortOption,
                        sortDirection: direction,
                    }
                }
                return sortOption
            })
        })
    }

    const handleToggleSort = (index: number) => {
        setSort((prevSort) => {
            return prevSort.map((sortOption, i) => {
                if (i === index) {
                    return {
                        ...sortOption,
                        enabled: !sortOption.enabled,
                    }
                }
                return sortOption
            })
        })
    }

    return (
        <Grid container item xs={'auto'}>
            <Button onClick={handleClick}>Sort</Button>
            <Popper open={open} anchorEl={anchorEl} container={document.body}>
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper sx={{ maxHeight: '80vh', overflow: 'auto' }}>
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="sort">
                                {(provided) => (
                                    <Box {...provided.droppableProps} ref={provided.innerRef}>
                                        {sort.map((sortOption, i) => (
                                            <Draggable
                                                key={sortOption.sortBy}
                                                draggableId={sortOption.sortBy}
                                                index={i}
                                            >
                                                {(provided, snapshot) => (
                                                    <DraggablePortalWrapper isDragging={snapshot.isDragging}>
                                                        <Box
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            display={'flex'}
                                                            justifyContent={'space-between'}
                                                            alignItems={'center'}
                                                            minWidth={200}
                                                        >
                                                            <Checkbox
                                                                checked={sortOption.enabled}
                                                                onChange={() => handleToggleSort(i)}
                                                            />
                                                            <Typography>{sortOption.sortBy}</Typography>
                                                            <Box display={'flex'} gap={1}>
                                                                <IconButton
                                                                    size={'small'}
                                                                    onClick={() =>
                                                                        handleChangeSortDirection(
                                                                            i,
                                                                            MTG_Filter_SortDirection.ASC,
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowUpward
                                                                        color={
                                                                            sortOption.sortDirection ===
                                                                            MTG_Filter_SortDirection.ASC
                                                                                ? 'primary'
                                                                                : 'secondary'
                                                                        }
                                                                    />
                                                                </IconButton>
                                                                <IconButton
                                                                    size={'small'}
                                                                    onClick={() =>
                                                                        handleChangeSortDirection(
                                                                            i,
                                                                            MTG_Filter_SortDirection.DESC,
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowDownward
                                                                        color={
                                                                            sortOption.sortDirection ===
                                                                            MTG_Filter_SortDirection.DESC
                                                                                ? 'primary'
                                                                                : 'secondary'
                                                                        }
                                                                    />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                    </DraggablePortalWrapper>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </Box>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}
