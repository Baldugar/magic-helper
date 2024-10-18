import { createContext } from 'react'
import { MTGA_Card } from '../../graphql/types'

type DnDContextType = {
    type: string | null
    setType: (type: string | null) => void
    card: MTGA_Card | null
    setCard: (card: MTGA_Card | null) => void
}

export const DnDContext = createContext<DnDContextType>({
    setType: () => {},
    type: null,
    setCard: () => {},
    card: null,
})
