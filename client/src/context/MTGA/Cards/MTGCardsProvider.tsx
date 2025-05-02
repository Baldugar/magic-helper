import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card, MTG_Color } from '../../../graphql/types'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [loading, setLoading] = useState(true)

    const {
        queries: { getMTGCards },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCards().then((cards) => {
            setCards(
                cards.map((c) => ({
                    ...c,
                    colorIdentity: c.colorIdentity.length === 0 ? [MTG_Color.C] : c.colorIdentity,
                })),
            )
            setLoading(false)
        })
    }, [getMTGCards])

    return <MTGCardsContext.Provider value={{ cards, loading }}>{children}</MTGCardsContext.Provider>
}
