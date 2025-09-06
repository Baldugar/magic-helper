import { useContext } from 'react'
import { MTGDecksContext } from './MTGDecksContext'

/**
 * useMTGDecks provides access to the decks dashboard state and CRUD actions.
 *
 * Usage:
 * ```tsx
 * const { decks, loading, createDeck, deleteDeck, reload } = useMTGDecks();
 * useEffect(() => { if (!loading) console.log(decks); }, [loading]);
 * ```
 *
 * Must be used under `<MTGDecksProvider />`.
 */
export const useMTGDecks = () => useContext(MTGDecksContext)
