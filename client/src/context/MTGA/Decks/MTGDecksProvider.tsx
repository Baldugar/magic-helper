import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Deck, MTG_DeckCard, MTG_DeckDashboard } from '../../../graphql/types'
import { MTGDecksContext } from './MTGDecksContext'

export const MTGDecksProvider = ({ children }: { children: ReactNode }) => {
    const [decks, setDecks] = useState<Array<MTG_DeckDashboard>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGDecks },
        mutations: { createMTGDeck, deleteMTGDeck },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGDecks().then((decks) => {
            setDecks(decks)
            setLoading(false)
        })
    }, [getMTGDecks])

    const createDeck = (name: string) => {
        createMTGDeck({
            name,
        }).then((response) => {
            if (response.status) {
                setDecks([
                    ...decks,
                    {
                        cards: [],
                        ID: response.message ?? '',
                        name,
                        cardFrontImage: undefined,
                    },
                ])
            }
        })
    }

    const deleteDeck = (deckID: string) => {
        deleteMTGDeck(deckID).then((response) => {
            if (response.status) {
                setDecks(decks.filter((d) => d.ID !== deckID))
            }
        })
    }

    const convertDeckCardToDashboardDeckCard = (c: MTG_DeckCard) => ({
        card: {
            ID: c.card.ID,
            versions: c.card.versions.map((v) => ({
                ID: v.ID,
                isDefault: v.isDefault,
                isAlchemy: v.isAlchemy,
                cardFaces:
                    v.cardFaces?.map((f) => ({
                        imageUris: f.imageUris,
                    })) ?? [],
            })),
        },
        selectedVersionID: c.selectedVersionID,
    })

    const propagateChangesToDashboardDeck = (deck: MTG_Deck) => {
        setDecks(
            decks.map((d) =>
                d.ID === deck.ID
                    ? {
                          ID: deck.ID,
                          name: deck.name,
                          cardFrontImage: deck.cardFrontImage,
                          cards: deck.cards.map(convertDeckCardToDashboardDeckCard),
                      }
                    : d,
            ),
        )
    }

    const reload = () => {
        setLoading(true)
        getMTGDecks().then((decks) => {
            setDecks(decks)
            setLoading(false)
        })
    }

    return (
        <MTGDecksContext.Provider
            value={{ decks, loading, createDeck, deleteDeck, propagateChangesToDashboardDeck, reload }}
        >
            {children}
        </MTGDecksContext.Provider>
    )
}
