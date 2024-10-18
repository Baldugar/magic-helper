import { Handle, NodeResizer, Position, useUpdateNodeInternals } from '@xyflow/react'
import { drag } from 'd3-drag'
import { select } from 'd3-selection'
import { useEffect, useRef, useState } from 'react'

import styles from '../style.module.css'

export type ResizeRotateNodeProps = {
    id: string
    sourcePosition?: Position
    targetPosition?: Position
    data: {
        label: string
        resizable: boolean
        rotatable: boolean
    }
}

export const ResizeRotateNode = (props: ResizeRotateNodeProps) => {
    const { id, sourcePosition, targetPosition, data } = props
    const rotateControlRef = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()
    const [rotation, setRotation] = useState(0)
    const [resizable, setResizable] = useState(!!data.resizable)
    const [rotatable, setRotatable] = useState(!!data.rotatable)

    useEffect(() => {
        if (!rotateControlRef.current) {
            return
        }

        const selection = select(rotateControlRef.current)
        const dragHandler = drag<HTMLDivElement, unknown>().on('drag', (evt) => {
            const dx = evt.x - 100
            const dy = evt.y - 100
            const rad = Math.atan2(dx, dy)
            const deg = rad * (180 / Math.PI)
            setRotation(180 - deg)
            updateNodeInternals(id)
        })

        selection.call(dragHandler)
    }, [id, updateNodeInternals])

    return (
        <>
            <div
                style={{
                    transform: `rotate(${rotation}deg)`,
                }}
                className={styles.node}
            >
                <NodeResizer isVisible={resizable} minWidth={180} minHeight={100} />
                <div
                    ref={rotateControlRef}
                    style={{
                        display: rotatable ? 'block' : 'none',
                    }}
                    className={`nodrag ${styles.rotateHandle}`}
                />
                <div>
                    {data?.label}
                    <div>
                        <label>
                            <input
                                type="checkbox"
                                checked={resizable}
                                onChange={(evt) => setResizable(evt.target.checked)}
                            />
                            resizable
                        </label>
                    </div>
                    <div>
                        <label>
                            <input
                                type="checkbox"
                                checked={rotatable}
                                onChange={(evt) => setRotatable(evt.target.checked)}
                            />
                            rotatable
                        </label>
                    </div>
                </div>
                {sourcePosition && <Handle style={{ opacity: 0 }} position={sourcePosition} type="source" />}
                {targetPosition && <Handle style={{ opacity: 0 }} position={targetPosition} type="target" />}
            </div>
        </>
    )
}
