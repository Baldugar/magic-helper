import { ButtonBase } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { MTGACardWithHover } from '../../../components/MTGACardWithHover'
import { useDnD } from '../../../context/DnD/useDnD'
import { useMTGADeckCreator } from '../../../context/MTGA/DeckCreator/useMTGADeckCreator'
import { useMTGADeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGADeckFlowCreator'
import { MTGA_Card } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { ContextMenu, ContextMenuOption } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type CardsGridButtonProps = {
    card: MTGA_Card
}

export const CardsGridButton = (props: CardsGridButtonProps) => {
    const { card } = props
    const { onAddCard, deck, removeCard } = useMTGADeckCreator()
    const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGADeckFlowCreator()
    const { setNodes } = useReactFlow<NodeType>()
    const { card: draggedCard } = useDnD()
    const { anchorRef, handleClick, handleClose, handleContextMenu, open } = useContextMenu<HTMLDivElement>()

    const handleAddCard = (card: MTGA_Card) => {
        const newDeck = onAddCard(card)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone, handleDeletePhantom))
    }

    const handleRemoveCard = (card: MTGA_Card) => {
        removeCard(card)
        if (setNodes) setNodes((prev) => prev.filter((n) => !n.id.startsWith(card.ID)))
    }

    const deckCardIDs = deck?.cards.map((c) => c.card.ID) || []

    const cardIsInDeck = isCardInDeck(card, deck)

    const options: ContextMenuOption[] = [
        {
            label: !cardIsInDeck ? 'Add to deck' : 'Remove from deck',
            action: () => {
                if (!cardIsInDeck) {
                    handleAddCard(card)
                } else {
                    handleRemoveCard(card)
                }
            },
        },
        {
            label: 'View card',
            action: () => {
                window.open(card.scryfallURL, '_blank')
            },
        },
    ]

    if (cardIsInDeck) {
        options.splice(1, 0, {
            label: 'Add phantom',
            action: () => {
                handleAddCard(card)
            },
        })
    }

    return (
        <>
            <div ref={anchorRef} onContextMenu={handleContextMenu}>
                <ButtonBase
                    onClick={() => handleAddCard(card)}
                    sx={{
                        filter: deckCardIDs.includes(card.ID) ? 'brightness(0.5)' : 'brightness(1)',
                        transition: 'filter 0.3s',
                    }}
                >
                    <MTGACardWithHover card={card} hideHover={draggedCard !== null} debugValue={'releasedAt'} />
                </ButtonBase>
            </div>
            <ContextMenu
                anchorRef={anchorRef}
                options={options}
                open={open}
                handleClose={handleClose}
                handleClick={handleClick}
            />
        </>
    )
}
