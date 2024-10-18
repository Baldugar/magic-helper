import { ReactNode, useEffect, useState } from 'react'
import { MTGAFunctions } from '../../../graphql/MTGA/functions'
import { MTGA_Deck } from '../../../graphql/types'
import { MTGADecksContext } from './MTGADecksContext'

export const MTGADecksProvider = ({ children }: { children: ReactNode }) => {
    const [decks, setDecks] = useState<Array<MTGA_Deck>>([])
    const [loaded, setLoaded] = useState(false)

    const {
        queries: { getMTGADecks },
    } = MTGAFunctions

    useEffect(() => {
        if (!loaded) {
            getMTGADecks().then((decks) => {
                if (decks.length > 0) setDecks(decks)
                setLoaded(true)
            })
        }
    }, [getMTGADecks, loaded])

    const updateDeck = (deck: MTGA_Deck) => {
        const index = decks.findIndex((d) => d.ID === deck.ID)
        if (index !== -1) {
            decks[index] = deck
            setDecks([...decks])
        } else {
            setDecks([...decks, deck])
        }
    }

    return <MTGADecksContext.Provider value={{ decks, setDecks, updateDeck }}>{children}</MTGADecksContext.Provider>
}
