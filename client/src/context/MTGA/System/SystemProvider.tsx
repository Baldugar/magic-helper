import { ReactNode, useState } from 'react'
import { MTG_CardListType } from '../../../graphql/types'
import { SystemContext } from './SystemContext'

export const SystemProvider = ({ children }: { children: ReactNode }) => {
    const [list, setList] = useState<MTG_CardListType>(MTG_CardListType.MTG)

    return <SystemContext.Provider value={{ list, setList }}>{children}</SystemContext.Provider>
}
