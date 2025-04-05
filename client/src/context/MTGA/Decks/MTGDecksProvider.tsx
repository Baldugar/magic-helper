import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Deck } from '../../../graphql/types'
import { useSystem } from '../System/useSystem'
import { MTGDecksContext } from './MTGDecksContext'

export const MTGDecksProvider = ({ children }: { children: ReactNode }) => {
    const [decks, setDecks] = useState<Array<MTG_Deck>>([])
    const [loading, setLoading] = useState(true)
    const { list } = useSystem()

    const {
        queries: { getMTGDecks },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGDecks(list).then((decks) => {
            setDecks(decks)
            setLoading(false)
        })
    }, [getMTGDecks, list])

    const updateDeck = (deck: MTG_Deck) => {
        const index = decks.findIndex((d) => d.ID === deck.ID)
        if (index !== -1) {
            decks[index] = deck
            setDecks([...decks])
        } else {
            setDecks([...decks, deck])
        }
    }

    return (
        <MTGDecksContext.Provider value={{ decks, setDecks, updateDeck, loading }}>{children}</MTGDecksContext.Provider>
    )
}
