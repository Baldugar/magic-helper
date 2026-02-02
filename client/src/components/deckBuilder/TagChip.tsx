import { Chip, ChipProps } from '@mui/material'
import { FC } from 'react'
import { MTG_Tag } from '../../graphql/types'

const chipSx = {
    backgroundColor: '#1a1a1a',
    color: '#f5f5f5',
    fontWeight: 500,
    '& .MuiChip-deleteIcon': {
        color: 'rgba(255,255,255,0.7)',
        '&:hover': { color: '#fff' },
    },
}

export type TagChipProps = Omit<ChipProps, 'label'> & {
    tag: MTG_Tag
}

/** Single tag as a dark, high-contrast chip. */
export const TagChip: FC<TagChipProps> = ({ tag, size = 'small', sx, ...rest }) => (
    <Chip label={tag.name} size={size} sx={{ ...chipSx, ...sx } as ChipProps['sx']} {...rest} />
)

export type TagChipsProps = {
    tags: MTG_Tag[]
    wrap?: boolean
    size?: 'small' | 'medium'
}

/** List of tags as dark chips, optionally wrapped in a flex container. */
export const TagChips: FC<TagChipsProps> = ({ tags, wrap = true, size = 'small' }) => {
    if (tags.length === 0) return null
    const chips = tags.map((tag) => <TagChip key={tag.ID} tag={tag} size={size} />)
    if (!wrap) return <>{chips}</>
    return (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {chips}
        </span>
    )
}
