import { ButtonBase } from '@mui/material'
import { useReactFlow } from '@xyflow/react'
import { MTGACardWithHover } from '../../../components/MTGCardWithHover'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import { useMTGDeckFlowCreator } from '../../../context/MTGA/DeckCreatorFlow/useMTGDeckFlowCreator'
import { MTG_Card, MTG_CardVersion } from '../../../graphql/types'
import { isCardInDeck } from '../../../utils/functions/cardFunctions'
import { NodeType, organizeNodes } from '../../../utils/functions/nodeFunctions'
import { ContextMenu } from '../../../utils/hooks/ContextMenu/ContextMenu'
import { ContextMenuOption } from '../../../utils/hooks/ContextMenu/types'
import { useContextMenu } from '../../../utils/hooks/ContextMenu/useContextMenu'

export type VersionCardProps = {
    card: MTG_Card
    version: MTG_CardVersion
    closeDialog: () => void
}

export const VersionCard = (props: VersionCardProps) => {
    const { card, version, closeDialog } = props

    const { setNodes } = useReactFlow<NodeType>()
    const { handleDeleteZone, handleRenameZone, handleDeletePhantom } = useMTGDeckFlowCreator()
    const { onAddCard, deck, setDeck, setCardVersion } = useMTGDeckCreator()

    const handleAddCard = (card: MTG_Card, versionID?: string) => {
        const newDeck = onAddCard(card, undefined, undefined, versionID)
        if (!newDeck) return
        setNodes(organizeNodes(newDeck, handleDeleteZone, handleRenameZone, handleDeletePhantom))
    }

    const {
        anchorRef: versionCardAnchorRef,
        handleClick: versionCardHandleClick,
        handleClose: versionCardHandleClose,
        handleContextMenu: versionCardHandleContextMenu,
        open: versionCardOpen,
    } = useContextMenu<HTMLDivElement>()

    const versionCardOptions: ContextMenuOption[] = [
        {
            id: version.ID,
            label: 'Add as deck image',
            action: () => {
                if (!deck) return
                setDeck((prev) => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        cardFrontImage: {
                            ...card,
                            versions: [version],
                        },
                    }
                })
            },
        },
        {
            label: 'Log version',
            action: () => {
                console.log(version)
            },
        },
    ]

    return (
        <>
            <div ref={versionCardAnchorRef} onContextMenu={versionCardHandleContextMenu}>
                <ButtonBase
                    onClick={
                        isCardInDeck(card, deck)
                            ? () => {
                                  setCardVersion(card.ID, version.ID)
                                  closeDialog()
                              }
                            : () => {
                                  handleAddCard(card, version.ID)
                                  closeDialog()
                              }
                    }
                >
                    <MTGACardWithHover
                        data={{
                            card: version,
                            type: 'cardVersion',
                            cardTypeLine: card.typeLine,
                            layout: card.layout,
                        }}
                    />
                </ButtonBase>
            </div>
            <ContextMenu
                anchorRef={versionCardAnchorRef}
                options={versionCardOptions}
                open={versionCardOpen}
                handleClose={versionCardHandleClose}
                handleClick={versionCardHandleClick}
            />
        </>
    )
}
