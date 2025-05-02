import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Color, MTG_Deck } from '../../../graphql/types'
import { MTGDecksContext } from './MTGDecksContext'

export const MTGDecksProvider = ({ children }: { children: ReactNode }) => {
    const [decks, setDecks] = useState<Array<MTG_Deck>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGDecks },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGDecks().then((decks) => {
            setDecks(
                decks.map((d) => ({
                    ...d,
                    cards: d.cards.map((c) => ({
                        ...c,
                        card: {
                            ...c.card,
                            colorIdentity: c.card.colorIdentity.length === 0 ? [MTG_Color.C] : c.card.colorIdentity,
                        },
                    })),
                })),
            )
            setLoading(false)
        })
    }, [getMTGDecks])

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
