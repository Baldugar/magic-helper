import { ArrowDownward, ArrowUpward, Delete, Public } from '@mui/icons-material'
import {
    Box,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
    Divider,
    FormControlLabel,
    IconButton,
    ListItem,
    ListItemText,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material'
import { memo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList, ListChildComponentProps } from 'react-window'
import { useMTGCardPackages } from '../../../context/MTGA/CardPackages/useCardPackages'
import { MainOrSide, MTG_CardPackage } from '../../../graphql/types'

type CardPackageProps = {
    cardPackage: MTG_CardPackage
    onToggleVisibility?: (cardPackage: MTG_CardPackage, nextValue: boolean) => Promise<void>
}

/**
 * PackageCard renders a summary card for a Card Package with counts and
 * a virtualized list of entries when expanded. Delete is confirmed via dialog.
 */
const PackageCard = ({ cardPackage, onToggleVisibility }: CardPackageProps) => {
    const { deleteCardPackage } = useMTGCardPackages()

    const handleDelete = async () => {
        const confirmDelete = window.confirm('Are you sure you want to delete this card package?')
        if (!confirmDelete) return
        await deleteCardPackage(cardPackage.ID)
    }

    const [expanded, setExpanded] = useState(false)
    const [visibilityLoading, setVisibilityLoading] = useState(false)

    const handleToggleVisibility = async (nextValue: boolean) => {
        if (!onToggleVisibility) return
        setVisibilityLoading(true)
        try {
            await onToggleVisibility(cardPackage, nextValue)
        } catch (error) {
            console.error('Failed to update card package visibility', error)
        } finally {
            setVisibilityLoading(false)
        }
    }

    const totalCards = cardPackage.cards.reduce((sum, card) => sum + card.count, 0)
    const mainDeckCards = cardPackage.cards
        .filter((card) => card.mainOrSide === MainOrSide.MAIN || !card.mainOrSide)
        .reduce((sum, card) => sum + card.count, 0)

    const sideboardCards = totalCards - mainDeckCards

    // Virtual row renderer
    const CardRow = memo(({ index, style }: ListChildComponentProps) => {
        const packageCard = cardPackage.cards[index]

        return (
            <ListItem style={style} key={packageCard.card.ID} alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                    primary={packageCard.card.name}
                    secondary={
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {packageCard.card.typeLine}
                        </Typography>
                    }
                />
            </ListItem>
        )
    })

    return (
        <Card sx={{ maxWidth: 345, minWidth: 300, boxShadow: 2 }}>
            <CardHeader
                title={
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" component="div">
                            {cardPackage.name}
                        </Typography>
                        {cardPackage.isPublic && (
                            <Chip size="small" color="info" icon={<Public fontSize="inherit" />} label='Public' />
                        )}
                    </Box>
                }
                subheader={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip size="small" label={`${mainDeckCards} Main`} color="primary" variant="outlined" />
                        {sideboardCards > 0 && (
                            <Chip size="small" label={`${sideboardCards} Side`} color="secondary" variant="outlined" />
                        )}
                    </Box>
                }
                action={
                    <IconButton onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label='show more'>
                        {expanded ? <ArrowUpward fontSize='small' /> : <ArrowDownward fontSize='small' />}
                    </IconButton>
                }
            />
            <Divider />
            <CardContent>
                <Collapse in={expanded} timeout='auto' unmountOnExit>
                    <div style={{ height: 300, width: '100%' }}>
                        <AutoSizer>
                            {({ height, width }) => (
                                <FixedSizeList
                                    height={height}
                                    width={width}
                                    itemSize={60}
                                    itemCount={cardPackage.cards.length}
                                    overscanCount={5}
                                >
                                    {CardRow}
                                </FixedSizeList>
                            )}
                        </AutoSizer>
                    </div>
                </Collapse>
                {!expanded && (
                    <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
                        Click to view {cardPackage.cards.length} unique cards ({totalCards} total)
                    </Typography>
                )}
            </CardContent>
            <CardActions sx={{ justifyContent: onToggleVisibility ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                {onToggleVisibility && (
                    <FormControlLabel
                        onClick={(event) => event.stopPropagation()}
                        control={
                            <Switch
                                size='small'
                                color='primary'
                                checked={cardPackage.isPublic}
                                onChange={(_, checked) => handleToggleVisibility(checked)}
                                onClick={(event) => event.stopPropagation()}
                                disabled={visibilityLoading}
                            />
                        }
                        label={cardPackage.isPublic ? 'Public' : 'Private'}
                    />
                )}
                {!cardPackage.isPublic && (
                    <Tooltip title='Delete package'>
                        <IconButton
                            onClick={(event) => {
                                event.stopPropagation()
                                void handleDelete()
                            }}
                        >
                            <Delete />
                        </IconButton>
                    </Tooltip>
                )}
            </CardActions>
        </Card>
    )
}

export default PackageCard
