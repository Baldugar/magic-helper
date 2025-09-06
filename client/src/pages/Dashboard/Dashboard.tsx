import { Stack } from '@mui/material'
import { CardPackageList } from './Components/CardPackageList/CardPackageList'
import { DeckList } from './Components/DeckList/DeckList'

/**
 * Dashboard aggregates high-level entities: Decks and Card Packages.
 * It renders creation controls and lists for both domains.
 */
const Dashboard = () => {
    return (
        <Stack padding={4} gap={2}>
            <DeckList />
            <CardPackageList />
        </Stack>
    )
}

export default Dashboard
