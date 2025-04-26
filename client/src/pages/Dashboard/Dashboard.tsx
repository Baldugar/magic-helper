import { Stack } from '@mui/material'
import { CardPackageList } from '../CardPackageList/CardPackageList'
import { DeckList } from '../DeckList/DeckList'

const Dashboard = () => {
    return (
        <Stack padding={4} gap={2}>
            <DeckList />
            <CardPackageList />
        </Stack>
    )
}

export default Dashboard
