import { Divider, Grid } from '@mui/material'
import { CMCSelector } from '../../../components/FilterSelectors/CMCSelector'
import ManaSelector from '../../../components/FilterSelectors/ManaSelector'
import RaritySelector from '../../../components/FilterSelectors/RaritySelector'
import TypeSelector from '../../../components/FilterSelectors/TypeSelector'
import { useMTGAFilter } from '../../../context/MTGA/Filter/useMTGAFilter'
import { nextTB, prevTB } from '../../../types/ternaryBoolean'

export const Filters = () => {
    const { filter, setFilter } = useMTGAFilter()

    return (
        <Grid container>
            <ManaSelector
                next={(c) => {
                    setFilter({ ...filter, color: { ...filter.color, [c]: nextTB(filter.color[c]) } })
                }}
                prev={(c) => {
                    setFilter({ ...filter, color: { ...filter.color, [c]: prevTB(filter.color[c]) } })
                }}
                selected={filter.color}
                iconSize={30}
                multi={{
                    next: () => {
                        setFilter({ ...filter, multiColor: nextTB(filter.multiColor) })
                    },
                    prev: () => {
                        setFilter({ ...filter, multiColor: prevTB(filter.multiColor) })
                    },
                    value: filter.multiColor,
                }}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <RaritySelector
                onNext={(r) => {
                    setFilter({
                        ...filter,
                        rarity: { ...filter.rarity, [r]: nextTB(filter.rarity[r]) },
                    })
                }}
                onPrev={(r) => {
                    setFilter({
                        ...filter,
                        rarity: { ...filter.rarity, [r]: prevTB(filter.rarity[r]) },
                    })
                }}
                selected={filter.rarity}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <CMCSelector
                onNext={(cmc) => {
                    setFilter({
                        ...filter,
                        manaCosts: { ...filter.manaCosts, [cmc]: nextTB(filter.manaCosts[cmc]) },
                    })
                }}
                onPrev={(cmc) => {
                    setFilter({
                        ...filter,
                        manaCosts: { ...filter.manaCosts, [cmc]: prevTB(filter.manaCosts[cmc]) },
                    })
                }}
                selected={filter.manaCosts}
                iconSize={30}
            />
            <Divider orientation={'vertical'} flexItem sx={{ mx: 2 }} />
            <TypeSelector
                onNext={(type) => {
                    setFilter({
                        ...filter,
                        cardTypes: { ...filter.cardTypes, [type]: nextTB(filter.cardTypes[type]) },
                    })
                }}
                onPrev={(type) => {
                    setFilter({
                        ...filter,
                        cardTypes: { ...filter.cardTypes, [type]: prevTB(filter.cardTypes[type]) },
                    })
                }}
                selected={filter.cardTypes}
                iconSize={30}
            />
        </Grid>
    )
}
