import { Stack } from '@mui/material'
import { ReimportButton } from '../../components/deckBuilder/ReimportButton/ReimportButton'
import { DeckList } from './Components/DeckList/DeckList'

/**
 * Dashboard aggregates high-level entities: Decks and Card Packages.
 * It renders creation controls and lists for both domains.
 */
const Dashboard = () => {
    return (
        <Stack padding={4} gap={2}>
            <Stack direction="row" justifyContent="flex-end">
                <ReimportButton />
            </Stack>
            <DeckList />
        </Stack>
    )
}

export default Dashboard
