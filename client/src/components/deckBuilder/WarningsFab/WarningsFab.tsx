import { WarningAmber } from '@mui/icons-material'
import {
    Badge,
    Box,
    ClickAwayListener,
    Fab,
    List,
    ListItem,
    ListItemText,
    Paper,
    Popper,
    Typography,
} from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTG_Card, MTG_Deck, MTG_DeckCardType, MainOrSide } from '../../../graphql/types'

const COMMANDER_IDENTIFIERS: MTG_DeckCardType[] = [MTG_DeckCardType.COMMANDER]

const ALLOWED_COPIES_PATTERNS = {
    unlimited: [/a deck can have any number of cards named/i, /you may have any number of cards named/i],
    limited: /a deck can have up to (\d+) cards named/i,
}


type CommanderWarning = {
    id: string
    message: string
}

const isCommanderDeck = (deck: MTG_Deck | undefined) => {
    if (!deck) return false
    return deck.cards.some((deckCard) => COMMANDER_IDENTIFIERS.includes(deckCard.deckCardType))
}

const isBasicLand = (cardTypeLine: string | undefined) => {
    if (!cardTypeLine) return false
    return cardTypeLine.toLowerCase().includes('basic land')
}

const getAllowedCopies = (card: MTG_Card) => {
    if (isBasicLand(card.typeLine)) return Number.POSITIVE_INFINITY
    const oracleText = card.oracleText
    if (!oracleText) return 1
    if (ALLOWED_COPIES_PATTERNS.unlimited.some((pattern) => pattern.test(oracleText))) {
        return Number.POSITIVE_INFINITY
    }
    const limitedMatch = oracleText.match(ALLOWED_COPIES_PATTERNS.limited)
    if (limitedMatch) {
        const [, count] = limitedMatch
        const parsed = parseInt(count, 10)
        if (!Number.isNaN(parsed)) {
            return parsed
        }
    }
    return 1
}

const buildCommanderWarnings = (deck: MTG_Deck | undefined): CommanderWarning[] => {
    if (!deck) return []
    if (!isCommanderDeck(deck)) return []

    const warnings: CommanderWarning[] = []

    for (const deckCard of deck.cards) {
        // Ignore sideboard, commander slot, and cards missing data
        if (deckCard.mainOrSide !== MainOrSide.MAIN) continue
        if (COMMANDER_IDENTIFIERS.includes(deckCard.deckCardType)) continue

        const card = deckCard.card
        if (!card) continue

        const allowedCopies = getAllowedCopies(card)
        if (allowedCopies === Number.POSITIVE_INFINITY) continue

        const totalCopies = (deckCard.count ?? 0) + (deckCard.phantoms?.length ?? 0)

        if (totalCopies > allowedCopies) {
            const limitText = allowedCopies === 1 ? '1 copia' : `${allowedCopies} copias`
            warnings.push({
                id: card.ID,
                message: `${card.name}: ${totalCopies} copias detectadas (limite ${limitText} en formatos estilo Commander).`,
            })
        } else if (totalCopies > 1 && allowedCopies === 1) {
            warnings.push({
                id: card.ID,
                message: `${card.name}: ${totalCopies} copias detectadas (solo se permite 1 en formatos estilo Commander).`,
            })
        }
    }

    return warnings
}

export const WarningsFab = () => {
    const { deck } = useMTGDeckCreator()
    const warnings = useMemo(() => buildCommanderWarnings(deck), [deck])
    const [open, setOpen] = useState(false)
    const anchorRef = useRef<HTMLButtonElement | null>(null)

    if (warnings.length === 0) {
        return null
    }

    const handleToggle = () => {
        setOpen((prev) => !prev)
    }

    const handleClose = () => {
        setOpen(false)
    }

    return (
        <Box position="fixed" bottom={24} left={24} zIndex={1300}>
            <Fab
                color="warning"
                size="medium"
                ref={anchorRef}
                onClick={handleToggle}
                aria-label={`Mostrar avisos de mazo (${warnings.length})`}
            >
                <Badge color="error" badgeContent={warnings.length} overlap="circular">
                    <WarningAmber />
                </Badge>
            </Fab>
            <Popper open={open} anchorEl={anchorRef.current} placement="top-start" style={{ zIndex: 1300 }}>
                <ClickAwayListener onClickAway={handleClose}>
                    <Paper elevation={4} sx={{ maxWidth: 320, p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Avisos del mazo
                        </Typography>
                        <List dense>
                            {warnings.map((warning) => (
                                <ListItem key={warning.id} disablePadding>
                                    <ListItemText primary={warning.message} />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Box>
    )
}
