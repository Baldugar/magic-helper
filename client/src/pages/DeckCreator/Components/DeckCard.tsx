import { Add, Delete, Remove } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useState } from 'react'
import { HoverMouseComponent } from '../../../components/deckBuilder/CardTile/HoverMouseComponent'
import { MTG_DeckCard } from '../../../graphql/types'
import { CARD_SIZE_VALUES } from '../../../utils/constants'
import { getCorrectCardImage, matchesCommanderColorIdentity } from '../../../utils/functions/cardFunctions'

export type DeckCardProps = {
    deckCard: MTG_DeckCard
    addOne?: (deckCard: MTG_DeckCard) => void
    removeOne?: (deckCard: MTG_DeckCard) => void
    removeCard: (deckCard: MTG_DeckCard) => void
    commander?: MTG_DeckCard
    compact?: boolean
}

export const DeckCard = (props: DeckCardProps): JSX.Element | null => {
    const { deckCard, addOne, removeCard, removeOne, commander, compact } = props
    const { card } = deckCard

    const [hover, setHover] = useState(false)

    const selectedVersion =
        card.versions.find((v) => v.ID === deckCard.selectedVersionID) || card.versions.find((v) => v.isDefault)
    if (!selectedVersion) return null

    const normal = getCorrectCardImage(selectedVersion, 'normal')
    const otherNormal = getCorrectCardImage(selectedVersion, 'normal', true)

    const outline = matchesCommanderColorIdentity(deckCard, commander) ? undefined : '4px solid red'

    return (
        <>
            <Box
                height={compact ? '60px' : '100px'}
                width={1}
                display={'flex'}
                paddingX={compact ? 1 : 2}
                alignItems={'center'}
                sx={{
                    backgroundImage: `url(${getCorrectCardImage(selectedVersion, 'artCrop')})`,
                    backgroundSize: 'cover',
                    backgroundPositionY: '15%',
                    border: outline,
                }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <Box
                    width={1}
                    display={'flex'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                    padding={compact ? 0.5 : 1}
                    bgcolor={'rgba(0,0,0,0.2)'}
                >
                    <Typography sx={{ color: 'white', fontSize: compact ? '0.95rem' : undefined }}>
                        {selectedVersion.printedName}
                    </Typography>
                    <Box display={'flex'} alignItems={'center'} gap={1}>
                        {removeOne && (
                            <IconButton
                                size={compact ? 'small' : 'medium'}
                                onMouseEnter={() => setHover(false)}
                                onMouseLeave={() => setHover(true)}
                                onClick={() => removeOne(deckCard)}
                                sx={{ color: 'white' }}
                            >
                                <Remove />
                            </IconButton>
                        )}
                        <Typography sx={{ color: 'white', fontSize: compact ? '0.95rem' : undefined }}>
                            {deckCard.count}
                        </Typography>
                        {addOne && (
                            <IconButton
                                size={compact ? 'small' : 'medium'}
                                onMouseEnter={() => setHover(false)}
                                onMouseLeave={() => setHover(true)}
                                onClick={() => addOne(deckCard)}
                                sx={{ color: 'white' }}
                            >
                                <Add />
                            </IconButton>
                        )}
                        <IconButton
                            size={compact ? 'small' : 'medium'}
                            onMouseEnter={() => setHover(false)}
                            onMouseLeave={() => setHover(true)}
                            onClick={() => removeCard(deckCard)}
                            sx={{ ml: 1, color: 'white' }}
                        >
                            <Delete />
                        </IconButton>
                    </Box>
                </Box>
            </Box>
            {normal && hover && (
                <HoverMouseComponent
                    visible={hover}
                    img={normal}
                    height={CARD_SIZE_VALUES['normal'].height}
                    scale={0.75}
                    width={CARD_SIZE_VALUES['normal'].width}
                    otherImg={otherNormal}
                    imgHorizontal={card.typeLine.startsWith('Battle')}
                />
            )}
        </>
    )
}
