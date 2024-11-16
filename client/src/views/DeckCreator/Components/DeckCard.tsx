import { Add, Delete, Remove } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useState } from 'react'
import { HoverMouseComponent } from '../../../components/HoverMouseComponent'
import { MTGA_DeckCard } from '../../../graphql/types'
import { CARD_SIZE_VALUES } from '../../../utils/constants'
import { getCorrectCardImage, matchesCommanderColorIdentity } from '../../../utils/functions/cardFunctions'

export type DeckCardProps = {
    deckCard: MTGA_DeckCard
    addOne?: (deckCard: MTGA_DeckCard) => void
    removeOne?: (deckCard: MTGA_DeckCard) => void
    removeCard: (deckCard: MTGA_DeckCard) => void
    commander?: MTGA_DeckCard
}

export const DeckCard = (props: DeckCardProps): JSX.Element => {
    const { deckCard, addOne, removeCard, removeOne, commander } = props
    const { card } = deckCard

    const [hover, setHover] = useState(false)

    const normal = getCorrectCardImage(card, 'normal')
    const otherNormal = getCorrectCardImage(card, 'normal', true)

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
                    backgroundImage: `url(${getCorrectCardImage(deckCard.card, 'artCrop')})`,
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
                />
            )}
        </>
    )
}
