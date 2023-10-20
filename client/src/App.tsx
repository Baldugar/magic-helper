import { Container, Grid, Typography } from '@mui/material'
import { useState } from 'react'
import './App.css'
import jsonCards from './assets/cards.json'
import ColorSelector from './components/FilterSelectors/ColorSelector'
import RaritySelector from './components/FilterSelectors/RaritySelector'
import TypeSelector from './components/FilterSelectors/TypeSelector'
import RandomCommanderSelector from './components/RandomCommanderSelector'
import CardsContext from './hooks/cardsContext'
import { BASE_TYPE, RARITY } from './types/enums'
import { TernaryBoolean, nextTB, prevTB } from './types/ternaryBoolean'
import { MCOLOR, MTGACard } from './types/types'

function App() {
    const cards: MTGACard[] = jsonCards as MTGACard[]

    console.log(cards.filter((card) => card.card_faces && card.card_faces.filter((cf) => !cf.oracle_text).length > 0))

    return (
        <CardsContext.Provider value={cards}>
            <Container maxWidth={'sm'}>
                <Typography variant={'h1'}>Hello World</Typography>
                <SelectColor />
                <SelectRarity />
                <SelectType />
                <Grid xs={12} container>
                    <RandomCommanderSelector />
                </Grid>
            </Container>
        </CardsContext.Provider>
    )
}

export default App

const SelectColor = () => {
    const [colorsSelected, setColorsSelected] = useState<Record<MCOLOR, TernaryBoolean>>({
        W: TernaryBoolean.UNSET,
        U: TernaryBoolean.UNSET,
        B: TernaryBoolean.UNSET,
        R: TernaryBoolean.UNSET,
        G: TernaryBoolean.UNSET,
        C: TernaryBoolean.UNSET,
        M: TernaryBoolean.UNSET,
    })

    const onNext = (color: MCOLOR) => {
        const value = nextTB(colorsSelected[color])
        setColorsSelected({ ...colorsSelected, [color]: value })
    }

    const onPrev = (color: MCOLOR) => {
        const value = prevTB(colorsSelected[color])
        setColorsSelected({ ...colorsSelected, [color]: value })
    }

    return <ColorSelector onNext={onNext} onPrev={onPrev} selected={colorsSelected} />
}

const SelectRarity = () => {
    const [raritySelected, setRaritySelected] = useState<Record<RARITY, TernaryBoolean>>({
        common: TernaryBoolean.UNSET,
        uncommon: TernaryBoolean.UNSET,
        rare: TernaryBoolean.UNSET,
        mythic: TernaryBoolean.UNSET,
    })

    const onNext = (rarity: RARITY) => {
        const value = nextTB(raritySelected[rarity])
        setRaritySelected({ ...raritySelected, [rarity]: value })
    }

    const onPrev = (rarity: RARITY) => {
        const value = prevTB(raritySelected[rarity])
        setRaritySelected({ ...raritySelected, [rarity]: value })
    }

    return <RaritySelector onNext={onNext} onPrev={onPrev} selected={raritySelected} />
}

const SelectType = () => {
    const [typeSelected, setTypeSelected] = useState<Record<BASE_TYPE, TernaryBoolean>>({
        Artifact: TernaryBoolean.UNSET,
        Battle: TernaryBoolean.UNSET,
        Creature: TernaryBoolean.UNSET,
        Enchantment: TernaryBoolean.UNSET,
        Instant: TernaryBoolean.UNSET,
        Land: TernaryBoolean.UNSET,
        Legendary: TernaryBoolean.UNSET,
        Planeswalker: TernaryBoolean.UNSET,
        Snow: TernaryBoolean.UNSET,
        Sorcery: TernaryBoolean.UNSET,
    })

    const onNext = (rarity: BASE_TYPE) => {
        const value = nextTB(typeSelected[rarity])
        setTypeSelected({ ...typeSelected, [rarity]: value })
    }

    const onPrev = (rarity: BASE_TYPE) => {
        const value = prevTB(typeSelected[rarity])
        setTypeSelected({ ...typeSelected, [rarity]: value })
    }

    return <TypeSelector onNext={onNext} onPrev={onPrev} selected={typeSelected} />
}
