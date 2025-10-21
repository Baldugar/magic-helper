import { ReactNode, useState } from 'react'
import { MTGDeckCreatorFlowContext } from './MTGDeckCreatorFlowContext'

export const MTGDeckCreatorFlowProvider = ({ children }: { children: ReactNode }) => {
    const [readOnly, setReadOnly] = useState(false)
    const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)

    return (
        <MTGDeckCreatorFlowContext.Provider
            value={{
                draggingGroupId,
                setDraggingGroupId,
                readOnly,
                setReadOnly,
                isDirty,
                setIsDirty,
            }}
        >
            {children}
        </MTGDeckCreatorFlowContext.Provider>
    )
}
