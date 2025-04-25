import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useMTGDeckCreator } from '../context/MTGA/DeckCreator/useMTGDeckCreator'
import { MTG_DeckCardType } from '../graphql/types'

export const ExportDialog = () => {
    const { openExportDialog, setOpenExportDialog, deck } = useMTGDeckCreator()

    const nameForExport = (name: string) => {
        return name.split('//')[0].trim()
    }

    const exportDeck = () => {
        if (!deck) return ''
        const { cards } = deck
        const commander = cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
        const rest = cards.filter((c) => c.deckCardType === MTG_DeckCardType.NORMAL)

        let exportString = ''
        if (commander) {
            exportString += `Commander\n1 ${nameForExport(commander.card.name)}\n\n`
        }
        if (rest.length) {
            exportString += 'Deck\n'
            rest.forEach((c) => {
                exportString += `${c.count} ${nameForExport(c.card.name)}\n`
            })
        }
        return exportString
    }

    return (
        <Dialog
            open={openExportDialog}
            onClose={() => setOpenExportDialog(false)}
            fullWidth
            maxWidth={'xl'}
            PaperProps={{
                style: {
                    width: 'min(80vw, 600px)',
                },
            }}
        >
            <DialogTitle>Export Deck</DialogTitle>
            <DialogContent>
                {/* Area textfield */}
                <TextField id={'pasteDeck'} multiline fullWidth rows={10} variant="outlined" value={exportDeck()} />
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        // Copy to clipboard
                        navigator.clipboard.writeText(exportDeck())
                    }}
                >
                    Copy to Clipboard
                </Button>
            </DialogActions>
        </Dialog>
    )
}
