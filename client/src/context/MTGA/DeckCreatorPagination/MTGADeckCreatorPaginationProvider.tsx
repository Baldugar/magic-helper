import { ReactNode, useEffect, useState } from 'react'
import { MTGA_Card, MTGA_DeckCardType } from '../../../graphql/types'
import { filterCards } from '../../../views/DeckCreator/filterCards'
import { useMTGACards } from '../Cards/useMTGACards'
import { useMTGADeckCreator } from '../DeckCreator/useMTGADeckCreator'
import { useMTGAFilter } from '../Filter/useMTGAFilter'
import { MTGADeckCreatorPaginationContext } from './MTGADeckCreatorPaginationContext'

export const MTGADeckCreatorPaginationProvider = ({ children }: { children: ReactNode }) => {
    const { cards } = useMTGACards()
    const { selectingCommander, deck } = useMTGADeckCreator()
    const { filter, originalFilter, sort } = useMTGAFilter()
    const [page, setPage] = useState(0)
    const [filteredCards, setFilteredCards] = useState<MTGA_Card[]>(cards)
    const commander = deck?.cards.find((c) => c.deckCardType === MTGA_DeckCardType.COMMANDER)

    useEffect(() => {
        // if (!isEqual(filter, originalFilter) || selectingCommander) {
        setFilteredCards(filterCards(cards, filter, sort, selectingCommander, commander))
        // } else {
        //     setFilteredCards(cards)
        // }
    }, [filter, sort, cards, originalFilter, selectingCommander, commander])

    useEffect(() => {
        setPage(0)
    }, [filter, selectingCommander])

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
