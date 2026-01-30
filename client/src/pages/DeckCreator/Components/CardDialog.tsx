import { Add } from '@mui/icons-material'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { FlipCard } from '../../../components/deckBuilder/CardTile/FlipCard'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Tag } from '../../../graphql/types'
import { useMTGCards } from '../../../context/MTGA/Cards/useMTGCards'
import { useMTGDeckCreatorUI } from '../../../context/MTGA/DeckCreator/UI/useMTGDeckCreatorUI'

export const CardDialog = () => {
    const { openedCardDialog, setOpenedCardDialog } = useMTGDeckCreatorUI()
    const { cards, refetch } = useMTGCards()
    const card = cards.find((c) => c.ID === openedCardDialog)
    const [allTags, setAllTags] = useState<MTG_Tag[]>([])
    const [addTagId, setAddTagId] = useState<string>('')
    const [assigning, setAssigning] = useState(false)
    const [unassigning, setUnassigning] = useState<string | null>(null)

    useEffect(() => {
        if (card) {
            MTGFunctions.queries.getMTGTagsQuery().then(setAllTags).catch(() => setAllTags([]))
        }
    }, [card])

    const handleAssignTag = useCallback(async () => {
        if (!card || !addTagId) return
        setAssigning(true)
        try {
            await MTGFunctions.mutations.assignTagToCardMutation({ cardID: card.ID, tagID: addTagId })
            setAddTagId('')
            await refetch()
        } finally {
            setAssigning(false)
        }
    }, [card, addTagId, refetch])

    const handleUnassignTag = useCallback(
        async (tagID: string) => {
            if (!card) return
            setUnassigning(tagID)
            try {
                await MTGFunctions.mutations.unassignTagFromCardMutation({ cardID: card.ID, tagID })
                await refetch()
            } finally {
                setUnassigning(null)
            }
        },
        [card, refetch],
    )

    const tagsOnCard = card?.tags ?? []
    const availableToAdd = allTags.filter((t) => !tagsOnCard.some((c) => c.ID === t.ID))

    return (
        <Dialog open={!!card} onClose={() => setOpenedCardDialog(null)} fullWidth maxWidth={'xl'}>
            {card && (
                <>
                    <DialogTitle>{card.name}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12} lg={6} display={'flex'} justifyContent={'center'}>
                                <FlipCard card={card} />
                            </Grid>
                            <Grid item xs={12} lg={6}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Tags
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={0.5} alignItems="center" mb={1}>
                                    {tagsOnCard.map((tag) => (
                                        <Chip
                                            key={tag.ID}
                                            label={tag.name}
                                            size="small"
                                            onDelete={
                                                unassigning === tag.ID
                                                    ? undefined
                                                    : () => void handleUnassignTag(tag.ID)
                                            }
                                            disabled={unassigning === tag.ID}
                                        />
                                    ))}
                                    {tagsOnCard.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No tags. Add one below.
                                        </Typography>
                                    )}
                                </Box>
                                {availableToAdd.length > 0 && (
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <FormControl size="small" sx={{ minWidth: 160 }}>
                                            <InputLabel id="card-dialog-add-tag-label">Add tag</InputLabel>
                                            <Select
                                                labelId="card-dialog-add-tag-label"
                                                value={addTagId}
                                                label="Add tag"
                                                onChange={(e: SelectChangeEvent<string>) => setAddTagId(e.target.value)}
                                            >
                                                <MenuItem value="">
                                                    <em>Select...</em>
                                                </MenuItem>
                                                {availableToAdd.map((tag) => (
                                                    <MenuItem key={tag.ID} value={tag.ID}>
                                                        {tag.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Add />}
                                            onClick={() => void handleAssignTag()}
                                            disabled={!addTagId || assigning}
                                        >
                                            Add
                                        </Button>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    </DialogContent>
                </>
            )}
        </Dialog>
    )
}
