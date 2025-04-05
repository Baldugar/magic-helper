import { createContext, Dispatch, SetStateAction } from 'react'
import { MTG_Deck } from '../../../graphql/types'

type MTGDecksContextType = {
    decks: Array<MTG_Deck>
    setDecks: Dispatch<SetStateAction<Array<MTG_Deck>>>
    updateDeck: (deck: MTG_Deck) => void
    loading: boolean
}

export const MTGDecksContext = createContext<MTGDecksContextType>({
    decks: [],
    setDecks: () => {},
    updateDeck: () => {},
    loading: true,
})
