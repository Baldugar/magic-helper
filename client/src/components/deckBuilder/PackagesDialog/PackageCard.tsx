import {
    Box,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
    Divider,
    IconButton,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material'

import { ArrowDownward, ArrowUpward, Delete } from '@mui/icons-material'
import { memo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList, ListChildComponentProps } from 'react-window'
import { useMTGCardPackages } from '../../../context/MTGA/CardPackages/useCardPackages'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MainOrSide, MTG_CardPackage } from '../../../graphql/types'
type CardPackageProps = {
    cardPackage: MTG_CardPackage
}

/**
 * PackageCard renders a summary card for a Card Package with counts and
 * a virtualized list of entries when expanded. Delete is confirmed via dialog.
 */
const PackageCard = (props: CardPackageProps) => {
    const { cardPackage } = props

    const { setCardPackages, cardPackages } = useMTGCardPackages()
    const {
        mutations: { deleteMTGCardPackageMutation },
    } = MTGFunctions

    /** Confirm and delete the card package from server and local state. */
    const handleDelete = () => {
        const confirm = window.confirm('Are you sure you want to delete this card package?')
        if (!confirm) return
        deleteMTGCardPackageMutation(cardPackage.ID).then(() => {
            setCardPackages(cardPackages.filter((p) => p.ID !== cardPackage.ID))
        })
    }

    const [expanded, setExpanded] = useState(false)

    const totalCards = cardPackage.cards.reduce((sum, card) => sum + card.count, 0)
    const mainDeckCards = cardPackage.cards
        .filter((card) => card.mainOrSide === MainOrSide.MAIN || !card.mainOrSide)
        .reduce((sum, card) => sum + card.count, 0)

    const sideboardCards = totalCards - mainDeckCards

    // Virtual row renderer
    /**
     * Virtualized row renderer for package entries to keep rendering fast.
     */
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
                    <Typography variant="h6" component="div">
                        {cardPackage.name}
                    </Typography>
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
                    <IconButton onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label="show more">
                        {expanded ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                    </IconButton>
                }
            />
            <Divider />
            <CardContent>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
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
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Click to view {cardPackage.cards.length} unique cards ({totalCards} total)
                    </Typography>
                )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton onClick={handleDelete}>
                    <Delete />
                </IconButton>
            </CardActions>
        </Card>
    )
}

export default PackageCard
