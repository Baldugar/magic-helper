import { ExpandMore } from '@mui/icons-material'
import { Box, Chip, Collapse, IconButton, SxProps, Typography } from '@mui/material'
import { useState } from 'react'
import { CardTag, DeckTag, MTG_Color } from '../graphql/types'
import { calculateColor } from '../utils/functions/tagFunctions'

export interface TagPillProps {
    tag: CardTag | DeckTag
}

const TagPill = (props: TagPillProps): JSX.Element => {
    const { tag } = props
    const { ID, name, description, __typename, myRating } = tag
    const colors = __typename === 'DeckTag' ? tag.colors ?? [] : ([] as MTG_Color[])
    const tagColor = calculateColor(colors)
    const [open, setOpen] = useState(false)

    const chipStyle: SxProps = {
        display: 'flex',
        minHeight: 52,
        height: 52,
        width: '100%',
        maxWidth: 600,
        borderTopLeftRadius: 17,
        borderBottomLeftRadius: 17,
        borderTopRightRadius: 17,
        borderBottomRightRadius: 17,
        transition: 'border-radius 0.2s ease-in-out',
        '& .MuiChip-label': {
            flex: 1,
            px: 1, // paddingLeft/Right 8 px
            color: tagColor.foreground,
        },
        ...(tagColor.background && {
            background: tagColor.background,
        }),
        ...(tagColor.gradient && {
            backgroundImage: `linear-gradient(90deg,
        ${tagColor.gradient.left},
        ${tagColor.gradient.center ? `${tagColor.gradient.center},` : ''}
        ${tagColor.gradient.right})`,
        }),
        '&:hover': {
            borderTopLeftRadius: 17,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: 17,
            borderBottomRightRadius: 0,
        },
    }

    return (
        <Box key={ID}>
            <Chip
                label={
                    <Box display={'flex'} flex={1} overflow={'hidden'}>
                        <Box
                            flex={1}
                            height={'36px'}
                            display={'flex'}
                            flexDirection={'row'}
                            alignItems={'center'}
                            paddingX={'10px'}
                            borderRadius={'8px'}
                            border={'1px solid black'}
                            bgcolor={tagColor.foreground}
                            overflow={'hidden'}
                            columnGap={'4px'}
                        >
                            <Box
                                display={'flex'}
                                width={'28px'}
                                height={'28px'}
                                justifyContent={'center'}
                                alignItems={'center'}
                                bgcolor={'white'}
                                border={'1px solid black'}
                                borderRadius={'50%'}
                            >
                                <img
                                    src={`/img/category/${__typename === 'DeckTag' ? 'deck' : 'card'}Icon.png`}
                                    style={{ maxWidth: '22px', maxHeight: '22px' }}
                                />
                            </Box>
                            <Box display={'flex'}>
                                {Object.values(MTG_Color)
                                    .filter((c) => colors.includes(c))
                                    .map((c) => (
                                        <img key={c} src={`/img/mana/${c}.svg`} width={20} height={20} />
                                    ))}
                            </Box>
                            <Box
                                marginLeft={'auto'}
                                paddingLeft={2}
                                overflow={'hidden'}
                                display={'flex'}
                                columnGap={'4px'}
                            >
                                <Typography style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</Typography>
                                <IconButton
                                    size={'small'}
                                    onClick={() => setOpen(!open)}
                                    sx={{
                                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease-in-out',
                                    }}
                                >
                                    <ExpandMore />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                }
                sx={chipStyle}
            />
            <Collapse in={open} unmountOnExit>
                <Box bgcolor={'gray'} p={2}>
                    <Typography>{description}</Typography>
                    <Box display={'flex'} columnGap={'4px'}>
                        {myRating && <Typography>My Rating: {myRating.value}</Typography>}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    )
}

export default TagPill
