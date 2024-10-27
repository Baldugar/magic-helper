import { Box, Paper, Stack, Typography } from '@mui/material'
import { NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'

export type GroupNodeData = {
    label: string
    childrenIDs: string[]
}

export type GroupNodeProps = NodeProps & {
    data: GroupNodeData
}

export const GroupNode = (props: GroupNodeProps) => {
    const { data } = props
    const { label, childrenIDs } = data
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
                <NodeResizer isVisible={resizable} minWidth={180} minHeight={100} />
                <Box>
                    <Typography>{label}</Typography>
                </Box>
            </Box>
        </>
    )
}
