import { createContext } from 'react'
import { MTG_Deck, MTG_DeckDashboard } from '../../../graphql/types'

/**
 * Context shape for MTG Decks dashboard and CRUD operations.
 */
type MTGDecksContextType = {
    decks: Array<MTG_DeckDashboard>
    loading: boolean
    createDeck: (name: string) => void
    deleteDeck: (deckID: string) => void
    propagateChangesToDashboardDeck: (deck: MTG_Deck) => void
    reload: () => void
}

export const MTGDecksContext = createContext<MTGDecksContextType>({
    decks: [],
    loading: true,
    createDeck: () => {},
    deleteDeck: () => {},
    propagateChangesToDashboardDeck: () => {},
    reload: () => {},
})
