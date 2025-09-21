import { Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { MTGCardPackagesProvider } from './context/MTGA/CardPackages/CardPackagesProvider'
import { MTGDecksProvider } from './context/MTGA/Decks/MTGDecksProvider'
import AdminDashboardPage from './pages/Admin/AdminDashboardPage'
import Dashboard from './pages/Dashboard/Dashboard'
import { DeckCreatorWrapper } from './pages/DeckCreator/DeckCreator'

function MTGDataProviders() {
    return (
        <MTGDecksProvider>
            <MTGCardPackagesProvider>
                <Outlet />
            </MTGCardPackagesProvider>
        </MTGDecksProvider>
    )
}

/**
 * WrappedApp wires up the router and lazy route tree.
 * Providers are applied one level up to avoid remounting routes on context changes.
 */
function WrappedApp() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div>🥷🥷🥷🥷</div>}>
                <Routes>
                    <Route element={<MTGDataProviders />}>
                        <Route path={'/deck/:deckID'} element={<DeckCreatorWrapper />} />
                        <Route path={'/'} element={<Navigate to={'/dashboard'} />} />
                        <Route path={'/dashboard'} element={<Dashboard />} />
                    </Route>
                    <Route path={'/admin'} element={<AdminDashboardPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

/**
 * App composes top-level application providers and renders the route tree.
 */
function App() {
    return <WrappedApp />
}

export default App

// type YCard = {
//     name: string
// }

// const yCards = (yugiohCards as { data: Array<YCard> }).data
// const yCardsGame1 = (yugiohCardsGame as { data: Array<YCard> }).data

// const definiteCards: Array<YCard> = []
// for (const card of yCards) {
//     const cGameIdx = yCardsGame1.findIndex((c) => c.name === card.name)
//     if (cGameIdx !== -1) {
//         const cGame = yCardsGame1[cGameIdx]
//         definiteCards.push(cGame)
//         yCardsGame1.splice(cGameIdx, 1)
//     }
// }

// const yCardsGame2 = (yugiohCardsGame as { data: Array<YCard> }).data
// const missingCards: Array<YCard> = []
// for (const card of yCardsGame2) {
//     const cGameIdx = yCards.findIndex((c) => c.name === card.name)
//     if (cGameIdx === -1) {
//         missingCards.push(card)
//     }
// }

// console.log('definiteCards', definiteCards)
// console.log(
//     'missingCards',
//     missingCards.map((c) => c.name),
// )
