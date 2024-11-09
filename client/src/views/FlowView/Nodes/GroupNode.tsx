import { Box, Button, Paper, Stack, TextField } from '@mui/material'
import { NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'

export const MIN_SIZE = 180

export type GroupNodeData = {
    label: string
    childrenIDs: string[]
    onDelete: (nodeID: string, deleteNodes: boolean) => void
    onNameChange: (nodeID: string, newName: string) => void
}

export type GroupNodeProps = NodeProps & {
    data: GroupNodeData
}

export const GroupNode = (props: GroupNodeProps) => {
    const { data, id } = props
    const { label, childrenIDs, onDelete, onNameChange } = data
    const [resizable, setResizable] = useState(false)
    const [lockedChildren, setLockedChildren] = useState(true)
    const reactFlow = useReactFlow()

    useEffect(() => {
        const constraints = {
            extent: lockedChildren ? ('parent' as const) : undefined,
            expandParent: lockedChildren,
        }
        reactFlow.setNodes((nodes) => {
            return nodes.map((node) => {
                if (childrenIDs.includes(node.id)) {
                    return { ...node, ...constraints }
                }
                return node
            })
        })
    }, [lockedChildren, childrenIDs, reactFlow])

    return (
        <>
            <NodeToolbar position={Position.Right}>
                <Paper sx={{ padding: 2 }}>
                    <Stack direction={'column'}>
                        <label>
                            <input
                                type="checkbox"
                                checked={resizable}
                                onChange={(evt) => setResizable(evt.target.checked)}
                            />
                            resizable
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={lockedChildren}
                                onChange={(evt) => setLockedChildren(evt.target.checked)}
                            />
                            locked children
                        </label>
                        <Button
                            onClick={() => {
                                const respZone = confirm(`Are you sure you want to delete the zone "${label}"?`)
                                if (respZone) {
                                    let respNodes = false
                                    if (childrenIDs.length > 0) {
                                        respNodes = confirm('Do you want to delete the nodes inside the zone?')
                                    }
                                    onDelete(id, respNodes)
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Paper>
            </NodeToolbar>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '15px',
                    border: '1px solid black',
                    backgroundColor: '#f0f0f077',
                    padding: '20px',
                    boxSizing: 'border-box',
                }}
            >
                <NodeResizer isVisible={resizable} minWidth={MIN_SIZE} minHeight={MIN_SIZE} />
                <Box>
                    <TextField
                        value={label}
                        onChange={(e) => onNameChange(id, e.target.value)}
                        fullWidth
                        variant={'standard'}
                    />
                </Box>
            </Box>
        </>
    )
}
