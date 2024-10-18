import { ReactNode, useEffect, useState } from 'react'
import { MTGAFunctions } from '../../../graphql/MTGA/functions'
import { MTGA_Card } from '../../../graphql/types'
import { MTGACardsContext } from './MTGACardsContext'

export const MTGACardsProvider = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Array<MTGA_Card>>([])
    const [loaded, setLoaded] = useState(false)

    const {
        queries: { getMTGACards },
    } = MTGAFunctions

    useEffect(() => {
        if (!loaded) {
            getMTGACards().then((cards) => {
                if (cards.length > 0) setCards(cards)
                setLoaded(true)
            })
        }
    }, [loaded, getMTGACards])

    return <MTGACardsContext.Provider value={{ cards }}>{children}</MTGACardsContext.Provider>
}
