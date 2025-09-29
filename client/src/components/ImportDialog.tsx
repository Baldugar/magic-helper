import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTGFunctions } from '../graphql/MTGA/functions'
import { MainOrSide, MTG_Card, MTG_Deck, MTG_DeckCard, MTG_DeckCardType } from '../graphql/types'
import { findNextAvailablePosition } from '../utils/functions/nodeFunctions'

const ARENA_LINE_REGEX = /^(\d+)\s+(.+?)(?:\s+\([^)]*\)\s+\d+)?$/
const SIMPLE_LINE_REGEX = /^(\d+)\s+(.+)$/

const SECTION_MAP: Record<string, 'deck' | 'sideboard' | 'commander' | 'companion'> = {
    deck: 'deck',
    sideboard: 'sideboard',
    commander: 'commander',
    companion: 'companion',
}

type ParsedCardLine = {
    name: string
    count: number
}

type ParsedArenaDeck = {
    commander: ParsedCardLine[]
    companion: ParsedCardLine[]
    deck: ParsedCardLine[]
    sideboard: ParsedCardLine[]
}

type ParsedDeckResult = {
    decks: ParsedArenaDeck[]
    errors: string[]
}

const normalizeName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u2019`]/g, "'")
        .replace(/\u2212/g, '-')
        .trim()
        .toLowerCase()

const parseArenaDecklists = (input: string): ParsedDeckResult => {
    const decks: ParsedArenaDeck[] = []
    const errors: string[] = []
    const lines = input.replace(/\r\n/g, '\n').split('\n')

    let currentDeck: ParsedArenaDeck | null = null
    let currentSection: keyof ParsedArenaDeck = 'deck'

    const ensureDeck = () => {
        if (!currentDeck) {
            currentDeck = { commander: [], companion: [], deck: [], sideboard: [] }
            currentSection = 'deck'
        }
    }

    const hasContent = (deck: ParsedArenaDeck | null) => {
        if (!deck) return false
        return deck.deck.length > 0 || deck.sideboard.length > 0 || deck.commander.length > 0 || deck.companion.length > 0
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) {
            continue
        }

        const section = SECTION_MAP[line.toLowerCase()]
        if (section) {
            if (section === 'deck' && hasContent(currentDeck)) {
                decks.push(currentDeck as ParsedArenaDeck)
                currentDeck = { commander: [], companion: [], deck: [], sideboard: [] }
            } else {
                ensureDeck()
            }
            currentSection = section
            continue
        }

        ensureDeck()
        const match = line.match(ARENA_LINE_REGEX) ?? line.match(SIMPLE_LINE_REGEX)
        if (!match) {
            errors.push(line)
            continue
        }

        const count = Number.parseInt(match[1], 10)
        const name = match[2].trim()
        if (!Number.isFinite(count) || count <= 0 || !name) {
            errors.push(line)
            continue
        }

        currentDeck![currentSection].push({ name, count })
    }

    if (hasContent(currentDeck)) {
        decks.push(currentDeck as ParsedArenaDeck)
    }

    return { decks, errors }
}

const buildCardLookup = (cards: MTG_Card[]) => {
    const lookup = new Map<string, MTG_Card>()

    for (const card of cards) {
        const names = new Set<string>([card.name])
        if (card.name.includes('//')) {
            card.name.split('//').forEach((part) => names.add(part.trim()))
        }
        if (card.name.startsWith('A-')) {
            names.add(card.name.slice(2))
        }

        for (const version of card.versions) {
            version.cardFaces?.forEach((face) => {
                names.add(face.name)
                if (face.name.includes('//')) {
                    face.name.split('//').forEach((part) => names.add(part.trim()))
                }
            })
        }

        names.forEach((name) => {
            const key = normalizeName(name)
            if (!lookup.has(key)) {
                lookup.set(key, card)
            }
        })
    }

    return lookup
}

const findCardByName = (name: string, lookup: Map<string, MTG_Card>) => {
    const normalized = normalizeName(name)
    const candidates = [normalized]

    if (normalized.startsWith('a-')) {
        candidates.push(normalized.slice(2))
    }

    if (normalized.includes('//')) {
        const parts = normalized.split('//').map((part) => part.trim())
        candidates.push(parts[0])
        if (parts[1]) {
            candidates.push(parts[1])
        }
    }

    for (const candidate of candidates) {
        const card = lookup.get(candidate)
        if (card) {
            return card
        }
    }

    return undefined
}

const NUMBER_WORDS: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
}

const getAllowedCopies = (card: MTG_Card): number => {
    const oracle = card.oracleText?.toLowerCase() ?? ''
    const typeLine = card.typeLine.toLowerCase()

    if (typeLine.includes('basic') && typeLine.includes('land')) {
        return Number.POSITIVE_INFINITY
    }

    if (oracle.includes('deck can have any number of cards named') || oracle.includes('deck may have any number of cards named')) {
        return Number.POSITIVE_INFINITY
    }

    const upToMatch = oracle.match(/deck (?:can|may) have up to ([a-z0-9-]+) cards named/)
    if (upToMatch) {
        const token = upToMatch[1]
        const numeric = Number.parseInt(token, 10)
        if (!Number.isNaN(numeric)) {
            return numeric
        }
        const cleaned = token.replace(/-/g, ' ')
        const found = NUMBER_WORDS[cleaned] ?? cleaned.split(' ').map((part) => NUMBER_WORDS[part]).find((value) => value !== undefined)
        if (found) {
            return found
        }
    }

    return 1
}

type AggregatedResult = {
    commander: MTG_Card | undefined
    cards: Map<string, { card: MTG_Card; count: number }>
    unmatched: string[]
}

const aggregateDecks = (decks: ParsedArenaDeck[], lookup: Map<string, MTG_Card>): AggregatedResult => {
    const cards = new Map<string, { card: MTG_Card; count: number }>()
    const unmatched = new Set<string>()
    let commander: MTG_Card | undefined

    for (const deck of decks) {
        for (const commanderLine of deck.commander) {
            const commanderCard = findCardByName(commanderLine.name, lookup)
            if (commanderCard) {
                commander = commanderCard
            } else {
                unmatched.add(`Commander: ${commanderLine.name}`)
            }
        }

        for (const entry of deck.deck) {
            const card = findCardByName(entry.name, lookup)
            if (!card) {
                unmatched.add(entry.name)
                continue
            }

            if (commander && card.ID === commander.ID) {
                continue
            }

            const allowed = getAllowedCopies(card)
            const existing = cards.get(card.ID)

            if (!existing) {
                const initialCount = allowed === Number.POSITIVE_INFINITY ? entry.count : allowed === 1 ? 1 : Math.min(allowed, entry.count)
                cards.set(card.ID, {
                    card,
                    count: allowed === 1 ? 1 : initialCount,
                })
            } else if (allowed === 1) {
                existing.count = 1
            } else if (allowed === Number.POSITIVE_INFINITY) {
                existing.count += entry.count
            } else {
                existing.count = Math.min(allowed, existing.count + entry.count)
            }
        }
    }

    return { commander, cards, unmatched: Array.from(unmatched) }
}

const sortCardsByName = (cards: MTG_DeckCard[]) =>
    [...cards].sort((a, b) => a.card.name.localeCompare(b.card.name, undefined, { sensitivity: 'base' }))

const applyImportToDeck = (deck: MTG_Deck, aggregated: AggregatedResult): MTG_Deck => {
    const nextDeck = structuredClone(deck)
    const preservedCards = nextDeck.cards.filter(
        (card) => !(card.deckCardType === MTG_DeckCardType.NORMAL && card.mainOrSide === MainOrSide.MAIN),
    )

    let commanderPositionReference = preservedCards.find((card) => card.deckCardType === MTG_DeckCardType.COMMANDER)?.position

    if (aggregated.commander) {
        const commanderVersion =
            aggregated.commander.versions.find((version) => version.isDefault) ?? aggregated.commander.versions[0]
        const commanderIndex = preservedCards.findIndex((card) => card.deckCardType === MTG_DeckCardType.COMMANDER)

        if (commanderIndex >= 0) {
            preservedCards[commanderIndex] = {
                ...preservedCards[commanderIndex],
                card: aggregated.commander,
                count: 1,
                phantoms: [],
                selectedVersionID: commanderVersion?.ID,
            }
            commanderPositionReference = preservedCards[commanderIndex].position
        } else {
            const commanderPosition = commanderPositionReference ?? findNextAvailablePosition(preservedCards)
            preservedCards.push({
                card: aggregated.commander,
                count: 1,
                deckCardType: MTG_DeckCardType.COMMANDER,
                mainOrSide: MainOrSide.MAIN,
                phantoms: [],
                position: commanderPosition,
                selectedVersionID: commanderVersion?.ID,
            })
        }
    }

    const cardsForPositioning: MTG_DeckCard[] = [...preservedCards]
    const importedCards: MTG_DeckCard[] = []

    aggregated.cards.forEach(({ card, count }) => {
        if (aggregated.commander && card.ID === aggregated.commander.ID) {
            return
        }

        const version = card.versions.find((v) => v.isDefault) ?? card.versions[0]
        const position = findNextAvailablePosition(cardsForPositioning)
        const deckCard: MTG_DeckCard = {
            card,
            count,
            deckCardType: MTG_DeckCardType.NORMAL,
            mainOrSide: MainOrSide.MAIN,
            phantoms: [],
            position,
            selectedVersionID: version?.ID,
        }
        cardsForPositioning.push(deckCard)
        importedCards.push(deckCard)
    })

    nextDeck.cards = sortCardsByName([...preservedCards, ...importedCards])
    return nextDeck
}

export const ImportDialog = () => {
    const { openImportDialog, setOpenImportDialog, deck, setDeck } = useMTGDeckCreator()
    const [inputValue, setInputValue] = useState('')
    const [allCards, setAllCards] = useState<MTG_Card[]>([])
    const [loadingCards, setLoadingCards] = useState(false)
    const [cardsError, setCardsError] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)

    useEffect(() => {
        if (!openImportDialog || allCards.length > 0 || loadingCards) {
            return
        }
        setLoadingCards(true)
        setCardsError(null)
        const {
            queries: { getMTGCardsQuery },
        } = MTGFunctions
        getMTGCardsQuery()
            .then((cards) => {
                setAllCards(cards)
            })
            .catch(() => {
                setCardsError('Failed to load card database. Please try again.')
            })
            .finally(() => {
                setLoadingCards(false)
            })
    }, [allCards.length, loadingCards, openImportDialog])

    useEffect(() => {
        if (!openImportDialog) {
            setInputValue('')
            setParseError(null)
        }
    }, [openImportDialog])

    const cardLookup = useMemo(() => buildCardLookup(allCards), [allCards])

    const handleClose = () => {
        if (importing) return
        setOpenImportDialog(false)
    }

    const handleImport = () => {
        if (!deck) return
        if (!inputValue.trim()) {
            setParseError('Paste at least one MTG Arena export before importing.')
            return
        }
        if (cardsError) {
            setParseError(cardsError)
            return
        }
        if (loadingCards) {
            setParseError('Still loading card data. Please wait a moment.')
            return
        }

        setImporting(true)
        setParseError(null)

        try {
            const { decks: parsedDecks, errors } = parseArenaDecklists(inputValue)
            if (parsedDecks.length === 0) {
                setParseError('No deck sections were detected in the pasted text.')
                setImporting(false)
                return
            }

            const aggregated = aggregateDecks(parsedDecks, cardLookup)

            if (!aggregated.commander && aggregated.cards.size === 0) {
                setParseError('No matching cards were found in the pasted decklists.')
                setImporting(false)
                return
            }

            setDeck((prevDeck) => applyImportToDeck(prevDeck, aggregated))
            setOpenImportDialog(false)

            if (aggregated.unmatched.length > 0 || errors.length > 0) {
                const warningLines: string[] = []
                if (aggregated.unmatched.length > 0) {
                    warningLines.push(`Unmatched cards: ${aggregated.unmatched.sort().join(', ')}`)
                }
                if (errors.length > 0) {
                    warningLines.push(`Ignored lines: ${errors.join(', ')}`)
                }
                window.alert(['Deck import completed.', ...warningLines].join('\n'))
            }
        } catch (error) {
            setParseError('Import failed. Please check the decklist format and try again.')
        } finally {
            setImporting(false)
        }
    }

    return (
        <Dialog
            open={openImportDialog}
            onClose={handleClose}
            maxWidth={'xl'}
            PaperProps={{
                style: {
                    width: 'min(80vw, 600px)',
                },
            }}
        >
            <DialogTitle>Import MTG Arena Decks</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2">
                        Paste one or more MTG Arena deck exports below. Commanders will be merged, cards will be
                        deduplicated unless they can legally appear in multiples (e.g., basic lands, Rat Colony).
                    </Typography>
                    <TextField
                        id={'pasteDeck'}
                        multiline
                        fullWidth
                        rows={12}
                        variant="outlined"
                        placeholder="Paste your decklist(s) here"
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        disabled={importing}
                    />
                    {parseError && (
                        <Typography variant="body2" color="error">
                            {parseError}
                        </Typography>
                    )}
                    {cardsError && !parseError && (
                        <Typography variant="body2" color="error">
                            {cardsError}
                        </Typography>
                    )}
                    {loadingCards && (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={20} />
                            <Typography variant="body2">Loading card database...</Typography>
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={importing}>
                    Cancel
                </Button>
                <Button onClick={handleImport} variant="contained" disabled={importing || loadingCards || !!cardsError}>
                    {importing ? <CircularProgress size={18} /> : 'Import'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
