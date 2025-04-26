import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { MTGCardPackagesProvider } from './context/MTGA/CardPackages/CardPackagesProvider'
import { MTGCardsProvider } from './context/MTGA/Cards/MTGCardsProvider'
import { MTGDecksProvider } from './context/MTGA/Decks/MTGDecksProvider'
import Dashboard from './pages/Dashboard/Dashboard'
import { DeckCreatorWrapper } from './pages/DeckCreator/DeckCreator'

function WrappedApp() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div>🥷🥷🥷🥷</div>}>
                <Routes>
                    {/* <DeckCreator /> */}
                    {/* <ReactFlowProvider>
                <FlowView />
            </ReactFlowProvider> */}
                    <Route path={'/deck/:deckID'} element={<DeckCreatorWrapper />} />
                    <Route path={'/'} element={<Navigate to={'/dashboard'} />} />
                    <Route path={'/dashboard'} element={<Dashboard />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

function App() {
    return (
        <MTGCardsProvider>
            <MTGDecksProvider>
                <MTGCardPackagesProvider>
                    <WrappedApp />
                </MTGCardPackagesProvider>
            </MTGDecksProvider>
        </MTGCardsProvider>
    )
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

// const SelectColor = () => {
//     const [colorsSelected, setColorsSelected] = useState<Record<MCOLOR, TernaryBoolean>>({
//         W: TernaryBoolean.UNSET,
//         U: TernaryBoolean.UNSET,
//         B: TernaryBoolean.UNSET,
//         R: TernaryBoolean.UNSET,
//         G: TernaryBoolean.UNSET,
//         C: TernaryBoolean.UNSET,
//         M: TernaryBoolean.UNSET,
//     })

//     const onNext = (color: MCOLOR) => {
//         const value = nextTB(colorsSelected[color])
//         setColorsSelected({ ...colorsSelected, [color]: value })
//     }

//     const onPrev = (color: MCOLOR) => {
//         const value = prevTB(colorsSelected[color])
//         setColorsSelected({ ...colorsSelected, [color]: value })
//     }

//     return <ColorSelector onNext={onNext} onPrev={onPrev} selected={colorsSelected} />
// }

// const SelectRarity = () => {
//     const [raritySelected, setRaritySelected] = useState<Record<RARITY, TernaryBoolean>>({
//         common: TernaryBoolean.UNSET,
//         uncommon: TernaryBoolean.UNSET,
//         rare: TernaryBoolean.UNSET,
//         mythic: TernaryBoolean.UNSET,
//     })

//     const onNext = (rarity: RARITY) => {
//         const value = nextTB(raritySelected[rarity])
//         setRaritySelected({ ...raritySelected, [rarity]: value })
//     }

//     const onPrev = (rarity: RARITY) => {
//         const value = prevTB(raritySelected[rarity])
//         setRaritySelected({ ...raritySelected, [rarity]: value })
//     }

//     return <RaritySelector onNext={onNext} onPrev={onPrev} selected={raritySelected} />
// }

// const SelectType = () => {
//     const [typeSelected, setTypeSelected] = useState<Record<BASE_TYPE, TernaryBoolean>>({
//         Artifact: TernaryBoolean.UNSET,
//         Battle: TernaryBoolean.UNSET,
//         Creature: TernaryBoolean.UNSET,
//         Enchantment: TernaryBoolean.UNSET,
//         Instant: TernaryBoolean.UNSET,
//         Land: TernaryBoolean.UNSET,
//         Legendary: TernaryBoolean.UNSET,
//         Planeswalker: TernaryBoolean.UNSET,
//         Snow: TernaryBoolean.UNSET,
//         Sorcery: TernaryBoolean.UNSET,
//     })

//     const onNext = (rarity: BASE_TYPE) => {
//         const value = nextTB(typeSelected[rarity])
//         setTypeSelected({ ...typeSelected, [rarity]: value })
//     }

//     const onPrev = (rarity: BASE_TYPE) => {
//         const value = prevTB(typeSelected[rarity])
//         setTypeSelected({ ...typeSelected, [rarity]: value })
//     }

//     return <TypeSelector onNext={onNext} onPrev={onPrev} selected={typeSelected} />
// }
