import { useNodesState } from '@xyflow/react'
import { ReactNode, useEffect } from 'react'
import { organizeNodes } from '../../../utils/functions/nodeFunctions'
import { useMTGADeckCreator } from '../DeckCreator/useMTGADeckCreator'
import { MTGADeckCreatorFlowContext } from './MTGADeckCreatorFlowContext'

export const MTGADeckCreatorFlowProvider = ({ children }: { children: ReactNode }) => {
    const { deck } = useMTGADeckCreator()
    const [nodes, setNodes, onNodesChange] = useNodesState(organizeNodes(deck))

    useEffect(() => {
        if (deck && nodes.length === 0) {
            setNodes(organizeNodes(deck))
        }
    }, [deck, nodes, setNodes])

    return (
        <MTGADeckCreatorFlowContext.Provider
            value={{
                nodes,
                setNodes,
                onNodesChange,
            }}
        >
            {children}
        </MTGADeckCreatorFlowContext.Provider>
    )
}
