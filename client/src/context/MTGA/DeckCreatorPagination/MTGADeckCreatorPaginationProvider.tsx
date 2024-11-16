import { isEqual } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import { MTGA_Card } from '../../../graphql/types'
import { filterCards } from '../../../views/DeckCreator/filterCards'
import { useMTGACards } from '../Cards/useMTGACards'
import { useMTGADeckCreator } from '../DeckCreator/useMTGADeckCreator'
import { useMTGAFilter } from '../Filter/useMTGAFilter'
import { MTGADeckCreatorPaginationContext } from './MTGADeckCreatorPaginationContext'

export const MTGADeckCreatorPaginationProvider = ({ children }: { children: ReactNode }) => {
    const { cards } = useMTGACards()
    const { selectingCommander } = useMTGADeckCreator()
    const { filter, originalFilter, sort } = useMTGAFilter()
    const [page, setPage] = useState(0)
    const [filteredCards, setFilteredCards] = useState<MTGA_Card[]>(cards)

    useEffect(() => {
        if (!isEqual(filter, originalFilter) || selectingCommander) {
            setFilteredCards(filterCards(cards, filter, sort, selectingCommander))
        } else {
            setFilteredCards(cards)
        }
    }, [filter, sort, cards, originalFilter, selectingCommander])

    useEffect(() => {
        setPage(0)
    }, [filter])

    return (
        <MTGADeckCreatorPaginationContext.Provider
            value={{
                filteredCards,
                page,
                setPage,
            }}
        >
            {children}
        </MTGADeckCreatorPaginationContext.Provider>
    )
}
