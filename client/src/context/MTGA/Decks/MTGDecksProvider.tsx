import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Deck, MTG_DeckCard, MTG_DeckDashboard } from '../../../graphql/types'
import { MTGDecksContext } from './MTGDecksContext'

export const MTGDecksProvider = ({ children }: { children: ReactNode }) => {
    // Holds dashboard-friendly deck summaries
    const [decks, setDecks] = useState<Array<MTG_DeckDashboard>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGDecksQuery },
        mutations: { createMTGDeckMutation, deleteMTGDeckMutation },
    } = MTGFunctions

    /**
     * Initial load: fetch dashboard deck summaries.
     * Sets loading state while the request is in-flight.
     */
    useEffect(() => {
        setLoading(true)
        getMTGDecksQuery().then((decks) => {
            setDecks(decks)
            setLoading(false)
        })
    }, [getMTGDecksQuery])

    /**
     * Create a new deck and optimistically append it to the dashboard list.
     *
     * Side-effects:
     * - Issues a GraphQL mutation
     * - On success, updates local state with a minimal deck object
     *
     * Caveats:
     * - Uses Response.message as the newly created deck ID
     * - Does not fetch the full deck document here; consumers should navigate to the
     *   deck view to get full details if needed
     *
     * @param name Deck name
     */
    const createDeck = (name: string) => {
        createMTGDeckMutation({
            name,
        }).then((response) => {
            if (response.status) {
                // Optimistically append new deck to dashboard list
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

    /**
     * Delete an existing deck by ID and remove it from dashboard state.
     *
     * @param deckID Deck identifier
     */
    const deleteDeck = (deckID: string) => {
        deleteMTGDeckMutation(deckID).then((response) => {
            if (response.status) {
                setDecks(decks.filter((d) => d.ID !== deckID))
            }
        })
    }

    /**
     * Convert a full deck card to its dashboard-friendly shape (images only).
     *
     * @param c Full deck card entry
     * @returns Dashboard card entry
     */
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

    /**
     * Update the dashboard list with changes coming from a full deck document.
     *
     * Typical usage: after saving a deck in the editor, call this to keep the
     * dashboard in sync (name, front image, card previews).
     *
     * @param deck The updated full deck
     */
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

    /**
     * Force a reload of dashboard decks from the server.
     * Resets loading while fetching and replaces current state.
     */
    const reload = () => {
        setLoading(true)
        getMTGDecksQuery().then((decks) => {
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
