import { createContext, Dispatch, SetStateAction } from 'react'
import { MTGA_Deck } from '../../../graphql/types'

type MTGADecksContextType = {
    decks: Array<MTGA_Deck>
    setDecks: Dispatch<SetStateAction<Array<MTGA_Deck>>>
    updateDeck: (deck: MTGA_Deck) => void
}

export const MTGADecksContext = createContext<MTGADecksContextType>({
    decks: [],
    setDecks: () => {},
    updateDeck: () => {},
})
