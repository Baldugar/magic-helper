import { Add, Delete, Remove } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useState } from 'react'
import { HoverMouseComponent } from '../../../components/HoverMouseComponent'
import { MTG_DeckCard } from '../../../graphql/types'
import { CARD_SIZE_VALUES } from '../../../utils/constants'
import { getCorrectCardImage, matchesCommanderColorIdentity } from '../../../utils/functions/cardFunctions'

export type DeckCardProps = {
    deckCard: MTG_DeckCard
    addOne?: (deckCard: MTG_DeckCard) => void
    removeOne?: (deckCard: MTG_DeckCard) => void
    removeCard: (deckCard: MTG_DeckCard) => void
    commander?: MTG_DeckCard
}

export const DeckCard = (props: DeckCardProps): JSX.Element | null => {
    const { deckCard, addOne, removeCard, removeOne, commander } = props
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
                height={'100px'}
                width={1}
                display={'flex'}
                paddingX={2}
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
                    padding={1}
                    bgcolor={'rgba(0,0,0,0.2)'}
                >
                    <Typography sx={{ color: 'white' }}>{deckCard.card.name}</Typography>
                    <Box display={'flex'} alignItems={'center'} gap={1}>
                        {removeOne && (
                            <IconButton
                                onMouseEnter={() => setHover(false)}
                                onMouseLeave={() => setHover(true)}
                                onClick={() => removeOne(deckCard)}
                                sx={{ color: 'white' }}
                            >
                                <Remove />
                            </IconButton>
                        )}
                        <Typography sx={{ color: 'white' }}>{deckCard.count}</Typography>
                        {addOne && (
                            <IconButton
                                onMouseEnter={() => setHover(false)}
                                onMouseLeave={() => setHover(true)}
                                onClick={() => addOne(deckCard)}
                                sx={{ color: 'white' }}
                            >
                                <Add />
                            </IconButton>
                        )}
                        <IconButton
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
