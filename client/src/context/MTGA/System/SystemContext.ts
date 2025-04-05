import { createContext, Dispatch, SetStateAction } from 'react'
import { MTG_CardListType } from '../../../graphql/types'

type SystemContextType = {
    list: MTG_CardListType
    setList: Dispatch<SetStateAction<MTG_CardListType>>
}

export const SystemContext = createContext<SystemContextType>({
    list: MTG_CardListType.MTG,
    setList: () => {},
})
