import { ReactNode, useEffect, useState } from 'react'
import { MTGFunctions } from '../../../graphql/MTGA/functions'
import { MTG_Card } from '../../../graphql/types'
import { useSystem } from '../System/useSystem'
import { MTGCardsContext } from './MTGCardsContext'

export const MTGCardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTG_Card>>([])
    const [loading, setLoading] = useState(true)
    const { list } = useSystem()

    const {
        queries: { getMTGCards },
    } = MTGFunctions

    useEffect(() => {
        setLoading(true)
        getMTGCards(list).then((cards) => {
            setCards(cards)
            setLoading(false)
        })
    }, [getMTGCards, list])

    return <MTGCardsContext.Provider value={{ cards, loading }}>{children}</MTGCardsContext.Provider>
}
