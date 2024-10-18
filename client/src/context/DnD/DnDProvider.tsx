import { ReactNode, useState } from 'react'
import { MTGA_Card } from '../../graphql/types'
import { DnDContext } from './DnDContext'

export const DndCustomProvider = ({ children }: { children: ReactNode }) => {
    const [type, setType] = useState<string | null>(null)
    const [card, setCard] = useState<MTGA_Card | null>(null)

    return <DnDContext.Provider value={{ type, setType, card, setCard }}>{children}</DnDContext.Provider>
}
