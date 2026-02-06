import { Chip, ChipProps } from '@mui/material'
import { FC } from 'react'
import { MTG_Tag, MTG_TagAssignment } from '../../graphql/types'

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

export type TagChainDisplayProps = {
    assignment: MTG_TagAssignment
    size?: 'small' | 'medium'
}

/** Display a tag assignment chain, showing the chain of meta tags leading to the final tag. */
export const TagChainDisplay: FC<TagChainDisplayProps> = ({ assignment, size = 'small' }) => {
    // If chainDisplay is provided and non-empty, use it directly
    if (assignment.chainDisplay) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: size === 'small' ? '0.75rem' : '0.875rem',
                    color: '#f5f5f5',
                }}
            >
                {assignment.chainDisplay}
            </span>
        )
    }

    // Otherwise, build from chain + tag
    const allTags = [...assignment.chain, assignment.tag]
    return (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            {allTags.map((tag, index) => (
                <span key={tag.ID} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <TagChip tag={tag} size={size} />
                    {index < allTags.length - 1 && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: size === 'small' ? '0.7rem' : '0.8rem' }}>
                            {'\u2192'}
                        </span>
                    )}
                </span>
            ))}
        </span>
    )
}

export type TagAssignmentChipsProps = {
    assignments: MTG_TagAssignment[]
    wrap?: boolean
    size?: 'small' | 'medium'
}

/** List of tag assignments displayed as chain displays, optionally wrapped in a flex container. */
export const TagAssignmentChips: FC<TagAssignmentChipsProps> = ({ assignments, wrap = true, size = 'small' }) => {
    if (assignments.length === 0) return null
    const chips = assignments.map((assignment, index) => (
        <TagChainDisplay key={`${assignment.tag.ID}-${index}`} assignment={assignment} size={size} />
    ))
    if (!wrap) return <>{chips}</>
    return (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {chips}
        </span>
    )
}
