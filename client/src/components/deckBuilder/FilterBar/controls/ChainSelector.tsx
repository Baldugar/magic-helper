import {
    Badge,
    Box,
    Button,
    Chip,
    ClickAwayListener,
    Divider,
    Grid,
    IconButton,
    Paper,
    Popper,
    Typography,
} from '@mui/material'
import { Add, ArrowForward, Clear } from '@mui/icons-material'
import { MouseEvent, useRef, useState } from 'react'
import { TernaryBoolean } from '../../../../graphql/types'
import { isNegativeTB, isPositiveTB } from '../../../../types/ternaryBoolean'
import { TagChip } from '../../TagChip'
import { TernaryToggle } from './TernaryToggle'
import { ChainFilter } from '../../../../context/MTGA/Filter/MTGFilterContext'
import { useMTGFilter } from '../../../../context/MTGA/Filter/useMTGFilter'

export interface ChainSelectorProps {
    chains: ChainFilter[]
    onChainToggle: (terminalTagID: string, chainTagIDs: string[], value: TernaryBoolean) => void
}

const ChainSelector = (props: ChainSelectorProps): JSX.Element => {
    const { chains, onChainToggle } = props
    const { availableTags: tags, existingChains } = useMTGFilter()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Chain building state
    const [buildingChain, setBuildingChain] = useState<string[]>([]) // IDs of meta tags in order

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget)
    }

    const handleClickAway = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
        if (buttonRef.current?.contains(event.target as Node)) return
        setAnchorEl(null)
    }

    const open = Boolean(anchorEl)

    const metaTags = tags.filter((t) => t.meta)
    const allTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

    const howManyPositive = chains.filter((c) => isPositiveTB(c.value)).length
    const howManyNegative = chains.filter((c) => isNegativeTB(c.value)).length

    const handleAddToChain = (tagID: string) => {
        setBuildingChain([...buildingChain, tagID])
    }

    const handleRemoveLastFromChain = () => {
        setBuildingChain(buildingChain.slice(0, -1))
    }

    const handleCompleteChain = (terminalTagID: string) => {
        // Add the new chain with TRUE value
        onChainToggle(terminalTagID, buildingChain, TernaryBoolean.TRUE)
        setBuildingChain([])
    }

    const getTagById = (id: string) => tags.find((t) => t.ID === id)

    // Get the current value for a chain from filter state
    const getChainValue = (terminalTagID: string, chainTagIDs: string[]): TernaryBoolean => {
        const found = chains.find(
            (c) =>
                c.terminalTagID === terminalTagID &&
                c.chainTagIDs.length === chainTagIDs.length &&
                c.chainTagIDs.every((id, i) => id === chainTagIDs[i])
        )
        return found?.value ?? TernaryBoolean.UNSET
    }

    const cycleChainValue = (terminalTagID: string, chainTagIDs: string[]) => {
        const currentValue = getChainValue(terminalTagID, chainTagIDs)
        const nextValue =
            currentValue === TernaryBoolean.UNSET
                ? TernaryBoolean.TRUE
                : currentValue === TernaryBoolean.TRUE
                  ? TernaryBoolean.FALSE
                  : TernaryBoolean.UNSET
        onChainToggle(terminalTagID, chainTagIDs, nextValue)
    }

    const cycleChainValuePrev = (terminalTagID: string, chainTagIDs: string[]) => {
        const currentValue = getChainValue(terminalTagID, chainTagIDs)
        const prevValue =
            currentValue === TernaryBoolean.UNSET
                ? TernaryBoolean.FALSE
                : currentValue === TernaryBoolean.FALSE
                  ? TernaryBoolean.TRUE
                  : TernaryBoolean.UNSET
        onChainToggle(terminalTagID, chainTagIDs, prevValue)
    }

    // Check if a chain is a custom-built one (not in existingChains from database)
    const isCustomChain = (chain: ChainFilter): boolean => {
        return !existingChains.some(
            (ec) =>
                ec.tag.ID === chain.terminalTagID &&
                ec.chain.length === chain.chainTagIDs.length &&
                ec.chain.every((t, i) => t.ID === chain.chainTagIDs[i])
        )
    }

    // Get custom chains (chains in filter that don't exist in database)
    const customChains = chains.filter(isCustomChain)

    return (
        <Grid container item xs={'auto'}>
            <Badge
                badgeContent={howManyPositive}
                color="success"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Badge
                    badgeContent={howManyNegative}
                    color="error"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Button ref={buttonRef} onClick={handleClick}>Chains</Button>
                </Badge>
            </Badge>
            <Popper open={open} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 1300 }}>
                <ClickAwayListener onClickAway={handleClickAway}>
                    <Paper sx={{ maxHeight: '70vh', overflow: 'auto', minWidth: 320, p: 2 }}>
                        {/* Existing chains - shown like other filters */}
                        {existingChains.length > 0 && (
                            <>
                                <Typography variant="subtitle2" gutterBottom>
                                    Chain Filters
                                </Typography>
                                {existingChains.map((ec, i) => {
                                    const chainTagIDs = ec.chain.map((t) => t.ID)
                                    const terminalTagID = ec.tag.ID
                                    const value = getChainValue(terminalTagID, chainTagIDs)
                                    return (
                                        <Box
                                            key={i}
                                            display="flex"
                                            alignItems="center"
                                            gap={1}
                                            mb={0.5}
                                            sx={{
                                                p: 0.5,
                                                borderRadius: 1,
                                                bgcolor:
                                                    value === TernaryBoolean.TRUE
                                                        ? 'success.dark'
                                                        : value === TernaryBoolean.FALSE
                                                          ? 'error.dark'
                                                          : 'transparent',
                                            }}
                                        >
                                            <TernaryToggle
                                                value={value}
                                                type="textButton"
                                                textButtonProps={{
                                                    onClick: () => cycleChainValue(terminalTagID, chainTagIDs),
                                                    onContextMenu: (e) => {
                                                        e.preventDefault()
                                                        cycleChainValuePrev(terminalTagID, chainTagIDs)
                                                    },
                                                    children: (
                                                        <Typography variant="body2">
                                                            {ec.chainDisplay}
                                                        </Typography>
                                                    ),
                                                }}
                                            />
                                        </Box>
                                    )
                                })}
                            </>
                        )}

                        {/* Custom chains (built manually, not in database) */}
                        {customChains.length > 0 && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                    Custom Chains
                                </Typography>
                                {customChains.map((chain, i) => {
                                    const chainNames = chain.chainTagIDs.map((id) => getTagById(id)?.name ?? id)
                                    const terminalName = getTagById(chain.terminalTagID)?.name ?? chain.terminalTagID
                                    const displayName = [...chainNames, terminalName].join(' → ')
                                    return (
                                        <Box
                                            key={i}
                                            display="flex"
                                            alignItems="center"
                                            gap={1}
                                            mb={0.5}
                                            sx={{
                                                p: 0.5,
                                                borderRadius: 1,
                                                bgcolor:
                                                    chain.value === TernaryBoolean.TRUE
                                                        ? 'success.dark'
                                                        : chain.value === TernaryBoolean.FALSE
                                                          ? 'error.dark'
                                                          : 'transparent',
                                            }}
                                        >
                                            <TernaryToggle
                                                value={chain.value}
                                                type="textButton"
                                                textButtonProps={{
                                                    onClick: () => cycleChainValue(chain.terminalTagID, chain.chainTagIDs),
                                                    onContextMenu: (e) => {
                                                        e.preventDefault()
                                                        cycleChainValuePrev(chain.terminalTagID, chain.chainTagIDs)
                                                    },
                                                    children: (
                                                        <Typography variant="body2">
                                                            {displayName}
                                                        </Typography>
                                                    ),
                                                }}
                                            />
                                        </Box>
                                    )
                                })}
                            </>
                        )}

                        {existingChains.length === 0 && customChains.length === 0 && (
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                No chains available. Build one below or assign chains to cards.
                            </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Chain Builder Section */}
                        <Typography variant="subtitle2" gutterBottom>
                            Build New Chain
                        </Typography>

                        {/* Current chain being built */}
                        <Box
                            sx={{
                                p: 1,
                                mb: 2,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                minHeight: 40,
                            }}
                        >
                            {buildingChain.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                    Click meta tags below to start building a chain...
                                </Typography>
                            ) : (
                                <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                    {buildingChain.map((id, i) => (
                                        <Box key={i} display="flex" alignItems="center">
                                            <TagChip tag={getTagById(id)!} size="small" />
                                            <ArrowForward sx={{ fontSize: 14, mx: 0.5 }} />
                                        </Box>
                                    ))}
                                    <Typography variant="caption" color="text.secondary">
                                        ?
                                    </Typography>
                                    <IconButton size="small" onClick={handleRemoveLastFromChain}>
                                        <Clear sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Box>
                            )}
                        </Box>

                        {/* Meta tags to add to chain */}
                        <Typography variant="caption" color="text.secondary">
                            Meta tags (add to chain):
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                            {metaTags.map((tag) => (
                                <Chip
                                    key={tag.ID}
                                    label={tag.name}
                                    size="small"
                                    icon={<Add sx={{ fontSize: 14 }} />}
                                    onClick={() => handleAddToChain(tag.ID)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                            {metaTags.length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    No meta tags. Create some in Manage tags.
                                </Typography>
                            )}
                        </Box>

                        {/* Terminal tags to complete chain */}
                        {buildingChain.length > 0 && (
                            <>
                                <Typography variant="caption" color="text.secondary">
                                    Terminal tag (complete chain):
                                </Typography>
                                <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                                    {allTags.map((tag) => (
                                        <Chip
                                            key={tag.ID}
                                            label={tag.name}
                                            size="small"
                                            color={tag.meta ? 'primary' : 'default'}
                                            onClick={() => handleCompleteChain(tag.ID)}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Box>
                            </>
                        )}
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Grid>
    )
}

export default ChainSelector
