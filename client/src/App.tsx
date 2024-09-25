import { Container, Typography } from '@mui/material'
import { useEffect } from 'react'
import './App.css'
import jsonCards from './assets/cards.json'
import yugiohCards from './assets/yugioh_cards.json'
import yugiohCardsGame from './assets/yugioh_cards_game.json'
import { MTGAFunctions } from './graphql/MTGA/functions'
import CardsContext from './hooks/cardsContext'
import { MTGACard } from './types/types'

type YCard = {
    name: string
}

function App() {
    const {
        queries: { getMTGACards },
    } = MTGAFunctions
    const cards: MTGACard[] = jsonCards as MTGACard[]
    const yCards = (yugiohCards as { data: Array<YCard> }).data
    const yCardsGame1 = (yugiohCardsGame as { data: Array<YCard> }).data

    const definiteCards: Array<YCard> = []
    for (const card of yCards) {
        const cGameIdx = yCardsGame1.findIndex((c) => c.name === card.name)
        if (cGameIdx !== -1) {
            const cGame = yCardsGame1[cGameIdx]
            definiteCards.push(cGame)
            yCardsGame1.splice(cGameIdx, 1)
        }
    }

    const yCardsGame2 = (yugiohCardsGame as { data: Array<YCard> }).data
    const missingCards: Array<YCard> = []
    for (const card of yCardsGame2) {
        const cGameIdx = yCards.findIndex((c) => c.name === card.name)
        if (cGameIdx === -1) {
            missingCards.push(card)
        }
    }

    console.log('definiteCards', definiteCards)
    console.log(
        'missingCards',
        missingCards.map((c) => c.name),
    )

    useEffect(() => {
        getMTGACards().then((cards) => {
            console.log(cards.length)
        })
    }, [getMTGACards])

    //    console.log(cards.filter((card) => card.card_faces && card.card_faces.filter((cf) => !cf.oracle_text).length > 0))

    return (
        <CardsContext.Provider value={cards}>
            <Container maxWidth={'sm'}>
                <Typography variant={'h1'}>Hello World</Typography>
                {/* <SelectColor />
                <SelectRarity />
                <SelectType />
                <Grid xs={12} container>
                    <RandomCommanderSelector />
                </Grid> */}
            </Container>
        </CardsContext.Provider>
    )
}

export default App

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
