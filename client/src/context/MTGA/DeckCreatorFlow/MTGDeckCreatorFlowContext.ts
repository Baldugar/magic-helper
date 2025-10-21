import { createContext, Dispatch, SetStateAction } from 'react'

type MTGDeckCreatorFlowContextType = {
    draggingGroupId: string | null
    setDraggingGroupId: (id: string | null) => void
    readOnly: boolean
    setReadOnly: Dispatch<SetStateAction<boolean>>
    isDirty: boolean
    setIsDirty: Dispatch<SetStateAction<boolean>>
}

export const MTGDeckCreatorFlowContext = createContext<MTGDeckCreatorFlowContextType>({
    draggingGroupId: null,
    setDraggingGroupId: () => {},
    readOnly: false,
    setReadOnly: () => {},
    isDirty: false,
    setIsDirty: () => {},
})
