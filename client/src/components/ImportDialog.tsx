import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'

// type MTGA_ImportedCard = {
//     card: MTG_Card
//     number: number
// }

// type MTGA_ImportedDeck = {
//     commander: MTG_Card | null
//     companion: MTG_Card | null
//     deck: MTGA_ImportedCard[]
//     sideboard: MTGA_ImportedCard[]
//     totalCards: number
// }

export const ImportDialog = () => {
    const { openImportDialog, setOpenImportDialog } = useMTGDeckCreator()
    // const { cards } = useMTGCards()
    // const { setDeck } = useMTGDeckCreator()
    // const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGDeckFlowCreator()
    // const { setNodes } = useReactFlow<NodeType>()

    // const parseImportDeck = (copiedDeck: string, allCards: MTG_Card[]): MTGA_ImportedDeck => {
    //     const lines = copiedDeck.split('\n').map((line) => line.trim())
    //     const deck: MTGA_ImportedDeck = {
    //         commander: null,
    //         companion: null,
    //         deck: [],
    //         sideboard: [],
    //         totalCards: 0,
    //     }
    //     const unmatched: string[] = []
    //     let currentSection = 'deck' as 'deck' | 'sideboard' | 'commander' | 'companion'
    //     let isArenaImport = false
    //     const mtgArenaRegex = /^(\d+)\s(.+?)\s\((\w+)\)\s(\d+)$/ // e.g., "1 Llanowar Elves (DAR) 168"
    //     const simpleRegex = /^(\d+)\s(.+)$/ // e.g., "1 Llanowar Elves"

    //     lines.forEach((line, idx, arr) => {
    //         // Detect section headers
    //         if (line.toLowerCase() === 'companion') {
    //             currentSection = 'companion'
    //             return
    //         } else if (line.toLowerCase() === 'deck') {
    //             currentSection = 'deck'
    //             return
    //         } else if (line.toLowerCase() === 'sideboard') {
    //             currentSection = 'sideboard'
    //             return
    //         } else if (line.toLowerCase() === 'commander') {
    //             currentSection = 'commander'
    //             return
    //         }
    //         // Parse card line
    //         const arenaMatch = line.match(mtgArenaRegex)
    //         const simpleMatch = line.match(simpleRegex)

    //         if (arenaMatch) {
    //             isArenaImport = true
    //         }

    //         if (!isArenaImport && line.length === 0) {
    //             const lastCard = lines[idx + 1]
    //             const lastCardMatch = lastCard.match(simpleRegex)
    //             if (lastCardMatch) {
    //                 const [, , name] = lastCardMatch
    //                 const card = allCards.find(
    //                     (c) => c.name === name || (c.cardFaces && c.cardFaces.some((f) => f.name === name)),
    //                 )
    //                 let isSideboard = false
    //                 for (let i = 0; i < arr.length; i++) {
    //                     const match = arr[i].match(simpleRegex)
    //                     if (match) {
    //                         const [, count, name] = match
    //                         const amount = parseInt(count)
    //                         const card = allCards.find(
    //                             (c) => c.name === name || (c.cardFaces && c.cardFaces.some((f) => f.name === name)),
    //                         )
    //                         if (
    //                             amount > 1 &&
    //                             card &&
    //                             !(
    //                                 card.typeLine.toLowerCase().includes('basic') ||
    //                                 (card.description && card.description.toLowerCase().includes('a deck can have'))
    //                             )
    //                         ) {
    //                             isSideboard = true
    //                             break
    //                         }
    //                     }
    //                 }
    //                 if (isSideboard) {
    //                     currentSection = 'sideboard'
    //                 } else if (card && card.typeLine.toLowerCase().includes('legendary')) {
    //                     currentSection = 'commander'
    //                 }
    //             }
    //         }

    //         if (arenaMatch) {
    //             const [, count, name, set, number] = arenaMatch
    //             const parsedCard = { count: parseInt(count), name, set, number }
    //             const card = allCards.find(
    //                 (c) => c.name === name || (c.cardFaces && c.cardFaces.some((f) => f.name === name)),
    //             )
    //             if (currentSection === 'commander') {
    //                 if (card && card.typeLine.toLowerCase().includes('legendary')) {
    //                     deck.commander = card
    //                 } else {
    //                     unmatched.push('Commander: ' + line)
    //                 }
    //             } else if (currentSection === 'companion') {
    //                 if (card) {
    //                     deck.companion = card
    //                 } else {
    //                     unmatched.push('Companion: ' + line)
    //                 }
    //             } else {
    //                 if (card) {
    //                     deck[currentSection].push({ card, number: parsedCard.count })
    //                 } else {
    //                     unmatched.push('Deck - ' + currentSection + ': ' + line)
    //                 }
    //             }
    //         } else if (simpleMatch) {
    //             const [, count, name] = simpleMatch
    //             const parsedCard = { count: parseInt(count), name }
    //             const card = allCards.find(
    //                 (c) => c.name === name || (c.cardFaces && c.cardFaces.some((f) => f.name === name)),
    //             )
    //             if (currentSection === 'commander') {
    //                 if (card && card.typeLine.toLowerCase().includes('legendary')) {
    //                     deck.commander = card
    //                 } else {
    //                     unmatched.push('Commander: ' + line)
    //                 }
    //             } else if (currentSection === 'companion') {
    //                 if (card) {
    //                     deck.companion = card
    //                 } else {
    //                     unmatched.push('Companion: ' + line)
    //                 }
    //             } else {
    //                 if (card) {
    //                     deck[currentSection].push({ card, number: parsedCard.count })
    //                 } else {
    //                     unmatched.push('Deck - ' + currentSection + ': ' + line)
    //                 }
    //             }
    //         } else {
    //             if (line.length > 0) unmatched.push(line)
    //         }
    //     })

    //     deck.totalCards = deck.deck.reduce((acc, curr) => acc + curr.number, 0)
    //     deck.totalCards += deck.sideboard.reduce((acc, curr) => acc + curr.number, 0)
    //     if (deck.commander) deck.totalCards += 1
    //     if (deck.companion) deck.totalCards += 1

    //     const cardReport: Record<string, number> = {}
    //     deck.deck.forEach((c) => {
    //         cardReport[c.card.name] = c.number
    //     })
    //     deck.sideboard.forEach((c) => {
    //         cardReport[c.card.name] = c.number
    //     })
    //     if (deck.commander) cardReport[deck.commander.name] = 1
    //     if (deck.companion) cardReport[deck.companion.name] = 1

    //     return deck
    // }

    // const handleImport = (action: 'ADD' | 'REPLACE', keepZones: boolean) => {
    //     const field = document.getElementById('pasteDeck') as HTMLInputElement
    //     if (!field) return
    //     const decklist = field.value
    //     const importedDeck = parseImportDeck(decklist, cards)
    //     setDeck((prevDeck) => {
    //         const newDeck = structuredClone(prevDeck)
    //         if (!newDeck) return undefined
    //         if (importedDeck.commander) {
    //             if (importedDeck.totalCards > 60) {
    //                 newDeck.type = DeckType.BRAWL_100
    //             } else {
    //                 newDeck.type = DeckType.BRAWL_60
    //             }
    //             const currentCommanderIdx = newDeck.cards.findIndex(
    //                 (c) => c.deckCardType === MTG_DeckCardType.COMMANDER,
    //             )
    //             if (currentCommanderIdx >= 0) {
    //                 newDeck.cards.splice(currentCommanderIdx, 1, {
    //                     card: importedDeck.commander,
    //                     deckCardType: MTG_DeckCardType.COMMANDER,
    //                     mainOrSide: MainOrSide.MAIN,
    //                     count: 1,
    //                     phantoms: [],
    //                     position: {
    //                         x: 0,
    //                         y: 0,
    //                     },
    //                 })
    //             } else {
    //                 newDeck.cards.push({
    //                     card: importedDeck.commander,
    //                     deckCardType: MTG_DeckCardType.COMMANDER,
    //                     mainOrSide: MainOrSide.MAIN,
    //                     count: 1,
    //                     phantoms: [],
    //                     position: {
    //                         x: 0,
    //                         y: 0,
    //                     },
    //                 })
    //             }
    //         } else {
    //             // TODO: Handle no commander
    //         }
    //         if (importedDeck.companion) {
    //             const currentCompanionIdx = newDeck.cards.findIndex(
    //                 (c) => c.deckCardType === MTG_DeckCardType.COMPANION,
    //             )
    //             if (currentCompanionIdx >= 0) {
    //                 newDeck.cards.splice(currentCompanionIdx, 1, {
    //                     card: importedDeck.companion,
    //                     deckCardType: MTG_DeckCardType.COMPANION,
    //                     mainOrSide: MainOrSide.MAIN,
    //                     count: 1,
    //                     phantoms: [],
    //                     position: {
    //                         x: 0,
    //                         y: 0,
    //                     },
    //                 })
    //             } else {
    //                 newDeck.cards.push({
    //                     card: importedDeck.companion,
    //                     deckCardType: MTG_DeckCardType.COMPANION,
    //                     mainOrSide: MainOrSide.MAIN,
    //                     count: 1,
    //                     phantoms: [],
    //                     position: {
    //                         x: 0,
    //                         y: 0,
    //                     },
    //                 })
    //             }
    //         }
    //         let x = 0
    //         let y = 0
    //         const cardsToRemoveLater = newDeck.cards.filter(
    //             (c) => c.deckCardType === MTG_DeckCardType.NORMAL && c.mainOrSide === MainOrSide.MAIN,
    //         )
    //         const sideboardToRemoveLater = newDeck.cards.filter((c) => c.mainOrSide === MainOrSide.SIDEBOARD)
    //         const order: string[] = [
    //             'Creature',
    //             'Artifact',
    //             'Instant',
    //             'Sorcery',
    //             'Enchantment',
    //             'Battle',
    //             'Planeswalker',
    //             'Land',
    //         ]
    //         importedDeck.deck
    //             // Sort by type
    //             .sort((a, b) => {
    //                 const typeA = a.card.typeLine.split('—')[0].trim()
    //                 const typeB = b.card.typeLine.split('—')[0].trim()
    //                 let typeAIndex = order.findIndex((t) => typeA.includes(t))
    //                 let typeBIndex = order.findIndex((t) => typeB.includes(t))
    //                 if (typeAIndex === -1) typeAIndex = order.length
    //                 if (typeBIndex === -1) typeBIndex = order.length
    //                 return typeAIndex - typeBIndex
    //             })
    //             .forEach((c) => {
    //                 const currentIdx = newDeck.cards.findIndex(
    //                     (card) => card.card.ID === c.card.ID && card.mainOrSide === MainOrSide.MAIN,
    //                 )
    //                 if (currentIdx >= 0) {
    //                     const toRemoveIdx = cardsToRemoveLater.findIndex(
    //                         (card) => card.card.ID === c.card.ID && card.mainOrSide === MainOrSide.MAIN,
    //                     )
    //                     cardsToRemoveLater.splice(toRemoveIdx, 1)
    //                     if (action === 'REPLACE') {
    //                         newDeck.cards[currentIdx].count = c.number
    //                         newDeck.cards[currentIdx].position = {
    //                             x,
    //                             y,
    //                         }
    //                     } else {
    //                         newDeck.cards[currentIdx].count += c.number
    //                         newDeck.cards[currentIdx].position = {
    //                             x,
    //                             y,
    //                         }
    //                     }
    //                 } else {
    //                     newDeck.cards.push({
    //                         card: c.card,
    //                         deckCardType: MTG_DeckCardType.NORMAL,
    //                         mainOrSide: MainOrSide.MAIN,
    //                         count: c.number,
    //                         phantoms: [],
    //                         position: {
    //                             x,
    //                             y,
    //                         },
    //                     })
    //                 }
    //                 x += 100
    //                 if (x > 500) {
    //                     x = 0
    //                     y += 50
    //                 }
    //             })
    //         if (action === 'REPLACE') {
    //             for (const card of cardsToRemoveLater) {
    //                 const idx = newDeck.cards.findIndex(
    //                     (c) => c.card.ID === card.card.ID && c.mainOrSide === MainOrSide.MAIN,
    //                 )
    //                 newDeck.cards.splice(idx, 1)
    //             }
    //         }
    //         x = 0
    //         y = y + 250
    //         importedDeck.sideboard
    //             // Sort by type
    //             .sort((a, b) => {
    //                 const typeA = a.card.typeLine.split('—')[0].trim()
    //                 const typeB = b.card.typeLine.split('—')[0].trim()
    //                 let typeAIndex = order.findIndex((t) => typeA.includes(t))
    //                 let typeBIndex = order.findIndex((t) => typeB.includes(t))
    //                 if (typeAIndex === -1) typeAIndex = order.length
    //                 if (typeBIndex === -1) typeBIndex = order.length
    //                 return typeAIndex - typeBIndex
    //             })
    //             .forEach((c) => {
    //                 const currentIdx = newDeck.cards.findIndex(
    //                     (card) => card.card.ID === c.card.ID && card.mainOrSide === MainOrSide.SIDEBOARD,
    //                 )
    //                 if (currentIdx >= 0) {
    //                     const toRemoveIdx = sideboardToRemoveLater.findIndex(
    //                         (card) => card.card.ID === c.card.ID && card.mainOrSide === MainOrSide.SIDEBOARD,
    //                     )
    //                     sideboardToRemoveLater.splice(toRemoveIdx, 1)
    //                     if (action === 'REPLACE') {
    //                         newDeck.cards[currentIdx].count = c.number
    //                     } else {
    //                         newDeck.cards[currentIdx].count += c.number
    //                     }
    //                 } else {
    //                     newDeck.cards.push({
    //                         card: c.card,
    //                         deckCardType: MTG_DeckCardType.NORMAL,
    //                         mainOrSide: MainOrSide.SIDEBOARD,
    //                         count: c.number,
    //                         phantoms: [],
    //                         position: {
    //                             x,
    //                             y,
    //                         },
    //                     })
    //                     x += 100
    //                     if (x > 500) {
    //                         x = 0
    //                         y += 50
    //                     }
    //                 }
    //             })
    //         if (action === 'REPLACE') {
    //             for (const card of sideboardToRemoveLater) {
    //                 const idx = newDeck.cards.findIndex((c) => c.card.ID === card.card.ID)
    //                 newDeck.cards.splice(idx, 1)
    //             }
    //         }
    //         if (!keepZones) {
    //             newDeck.cards = newDeck.cards.map((c) => {
    //                 const zone = newDeck.zones.find((z) => z.childrenIDs.includes(c.card.ID))
    //                 let x = c.position.x
    //                 let y = c.position.y
    //                 if (zone) {
    //                     x += zone.position.x
    //                     y += zone.position.y
    //                 }
    //                 c.position = {
    //                     x,
    //                     y,
    //                 }
    //                 return c
    //             })
    //             newDeck.zones = []
    //         } else if (action === 'REPLACE') {
    //             newDeck.zones = newDeck.zones.map((z) => {
    //                 return {
    //                     ...z,
    //                     childrenIDs: [],
    //                 }
    //             })
    //         }
    //         setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone, handleDeletePhantom))
    //         return newDeck
    //     })
    //     setOpenImportDialog(false)
    // }

    return (
        <Dialog
            open={openImportDialog}
            onClose={() => setOpenImportDialog(false)}
            maxWidth={'xl'}
            PaperProps={{
                style: {
                    width: 'min(80vw, 600px)',
                },
            }}
        >
            <DialogTitle>Import Deck</DialogTitle>
            <DialogContent>
                {/* Area textfield */}
                <TextField
                    id={'pasteDeck'}
                    multiline
                    fullWidth
                    rows={10}
                    variant="outlined"
                    placeholder="Paste your decklist here"
                />
            </DialogContent>
            <DialogActions>
                {/* <Button onClick={() => handleImport('REPLACE', true)}>Import (REPLACE, KEEP ZONES)</Button>
                <Button onClick={() => handleImport('REPLACE', false)}>Import (REPLACE, REMOVE ZONES)</Button>
                <Button onClick={() => handleImport('ADD', true)}>Import (ADD)</Button> */}
            </DialogActions>
        </Dialog>
    )
}
