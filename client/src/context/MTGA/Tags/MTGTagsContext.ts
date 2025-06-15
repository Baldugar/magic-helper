import { createContext } from 'react'
import { CardTag, DeckTag } from '../../../graphql/types'

export interface MTGTagsContextType {
    cardTags: CardTag[]
    deckTags: DeckTag[]
}

export const initialMTGTags: MTGTagsContextType = {
    cardTags: [],
    deckTags: [],
}

export const MTGTagsContext = createContext<MTGTagsContextType>(initialMTGTags)
