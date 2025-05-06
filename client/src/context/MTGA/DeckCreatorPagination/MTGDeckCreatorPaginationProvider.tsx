import { useMediaQuery } from '@mui/material'
import { debounce } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import { MTG_Card, MTG_DeckCardType } from '../../../graphql/types'
import { filterCards } from '../../../pages/DeckCreator/filterCards'
import { useMTGCards } from '../Cards/useMTGCards'
import { useMTGDeckCreator } from '../DeckCreator/useMTGDeckCreator'
import { useMTGFilter } from '../Filter/useMTGFilter'
import { MTGDeckCreatorPaginationContext } from './MTGDeckCreatorPaginationContext'

export const MTGDeckCreatorPaginationProvider = ({ children }: { children: ReactNode }) => {
    const { cards } = useMTGCards()
    const { selectingCommander, deck } = useMTGDeckCreator()
    const { filter, originalFilter, sort } = useMTGFilter()
    const [page, setPage] = useState(0)
    const [filteredCards, setFilteredCards] = useState<MTG_Card[]>(cards)
    const commander = deck?.cards.find((c) => c.deckCardType === MTG_DeckCardType.COMMANDER)
    const isMobile = useMediaQuery('(max-width: 600px)')

    useEffect(() => {
        const debounced = debounce(() => {
            setFilteredCards(filterCards(cards, filter, sort, selectingCommander, commander))
        }, 300)
        debounced()
        return () => debounced.cancel()
    }, [filter, sort, cards, originalFilter, selectingCommander, commander])

    useEffect(() => {
        setPage(0)
    }, [filter, selectingCommander, isMobile])

    return (
        <MTGDeckCreatorPaginationContext.Provider
            value={{
                filteredCards: filteredCards.filter((c) =>
                    deck && filter.hideIgnored ? !deck.ignoredCards.includes(c.ID) : true,
                ),
                page,
                setPage,
            }}
        >
            {children}
        </MTGDeckCreatorPaginationContext.Provider>
    )
}
