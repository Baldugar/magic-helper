import { Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTG_Card, MTG_CardVersion, MTG_DeckCard, MainOrSide } from '../../../graphql/types'
import { getCorrectCardImage } from '../../../utils/functions/cardFunctions'
import { MTGCardWithHover } from '../../MTGCardWithHover'

const getDisplayVersion = (deckCard: MTG_DeckCard) => {
    const { card, selectedVersionID } = deckCard
    if (!card) return undefined
    if (selectedVersionID) {
        const version = card.versions.find((v) => v.ID === selectedVersionID)
        if (version) return version
    }
    return card.versions.find((v) => v.isDefault) ?? card.versions[0]
}

const getCoverImage = (version: MTG_CardVersion) => {
    return getCorrectCardImage(version, 'artCrop') ?? getCorrectCardImage(version, 'large') ?? ''
}

type VersionPickerState = {
    card: MTG_Card
    deckCard: MTG_DeckCard
}

export const DeckCoverPicker = () => {
    const { deck, setDeck } = useMTGDeckCreator()
    const [open, setOpen] = useState(false)
    const [versionPicker, setVersionPicker] = useState<VersionPickerState | null>(null)

    const candidateCards = useMemo(() => {
        if (!deck) return [] as MTG_DeckCard[]
        const map = new Map<string, MTG_DeckCard>()
        for (const deckCard of deck.cards) {
            if (!deckCard.card) continue
            if (deckCard.mainOrSide !== MainOrSide.MAIN) continue
            if (!map.has(deckCard.card.ID)) {
                map.set(deckCard.card.ID, deckCard)
            }
        }
        return Array.from(map.values())
    }, [deck])

    const currentCover = deck?.cardFrontImage

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    const applyCover = (card: MTG_Card, version: MTG_CardVersion) => {
        const image = getCoverImage(version)
        if (!image) return
        setDeck((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                cardFrontImage: {
                    cardID: card.ID,
                    versionID: version.ID,
                    image,
                },
            }
        })
        setVersionPicker(null)
        setOpen(false)
    }

    const handleQuickSelect = (deckCard: MTG_DeckCard) => {
        const version = getDisplayVersion(deckCard)
        if (!version) return
        applyCover(deckCard.card, version)
    }

    const handleOpenVersionPicker = (deckCard: MTG_DeckCard) => {
        if (!deckCard.card) return
        setVersionPicker({ card: deckCard.card, deckCard })
    }

    const handleCloseVersionPicker = () => setVersionPicker(null)

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            {currentCover?.image ? (
                <ButtonBase onClick={handleOpen} sx={{ borderRadius: 1 }}>
                    <img
                        src={currentCover.image}
                        alt="Deck cover"
                        style={{ width: 64, height: 89, objectFit: 'cover', borderRadius: 8 }}
                    />
                </ButtonBase>
            ) : null}
            <Button variant="outlined" size="small" onClick={handleOpen}>
                Cambiar portada
            </Button>

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle>Selecciona portada</DialogTitle>
                <DialogContent dividers>
                    {candidateCards.length === 0 ? (
                        <Typography variant="body2">AÃ±ade cartas al mazo para elegir una portada.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {candidateCards.map((deckCard) => {
                                const version = getDisplayVersion(deckCard)
                                if (!version) return null
                                return (
                                    <Grid item key={deckCard.card.ID} xs={12} sm={6} md={4} lg={3}>
                                        <Stack spacing={1} alignItems="center">
                                            <ButtonBase onClick={() => handleQuickSelect(deckCard)}>
                                                <MTGCardWithHover
                                                    data={{
                                                        type: 'cardVersion',
                                                        card: version,
                                                        layout: deckCard.card.layout,
                                                        cardTypeLine: deckCard.card.typeLine,
                                                    }}
                                                    forceSize="small"
                                                />
                                            </ButtonBase>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" variant="contained" onClick={() => handleQuickSelect(deckCard)}>
                                                    Usar esta versiÃ³n
                                                </Button>
                                                <Button size="small" variant="outlined" onClick={() => handleOpenVersionPicker(deckCard)}>
                                                    Ver mÃ¡s versiones
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                )
                            })}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {versionPicker && (
                <Dialog open onClose={handleCloseVersionPicker} fullWidth maxWidth="md">
                    <DialogTitle>Elige versiÃ³n para {versionPicker.card.name}</DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            {versionPicker.card.versions.map((version) => (
                                <Grid item key={version.ID} xs={12} sm={6} md={4} lg={3}>
                                    <ButtonBase onClick={() => applyCover(versionPicker.card, version)}>
                                        <MTGCardWithHover
                                            data={{
                                                type: 'cardVersion',
                                                card: version,
                                                layout: versionPicker.card.layout,
                                                cardTypeLine: versionPicker.card.typeLine,
                                            }}
                                            forceSize="small"
                                        />
                                    </ButtonBase>
                                </Grid>
                            ))}
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseVersionPicker}>Cancelar</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Stack>
    )
}
