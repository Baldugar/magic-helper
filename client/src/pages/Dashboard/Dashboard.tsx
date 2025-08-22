import { Stack } from '@mui/material'
import { MTGCardPackagesProvider } from '../../context/MTGA/CardPackages/CardPackagesProvider'
import { MTGDecksProvider } from '../../context/MTGA/Decks/MTGDecksProvider'
import { CardPackageList } from './Components/CardPackageList/CardPackageList'
import { DeckList } from './Components/DeckList/DeckList'

const Dashboard = () => {
    return (
        <MTGDecksProvider>
            <MTGCardPackagesProvider>
                <Stack padding={4} gap={2}>
                    <DeckList />
                    <CardPackageList />
                </Stack>
            </MTGCardPackagesProvider>
        </MTGDecksProvider>
    )
}

export default Dashboard
