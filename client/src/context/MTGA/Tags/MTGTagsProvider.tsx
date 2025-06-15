import { ReactNode, useEffect, useState } from 'react'
import { getTagsQuery } from '../../../graphql/MTGA/queries/getTags'
import { CardTag, DeckTag, Query } from '../../../graphql/types'
import { fetchData } from '../../../utils/functions/fetchData'
import { MTGTagsContext } from './MTGTagsContext'

export const MTGTagsProvider = ({ children }: { children: ReactNode }) => {
    const [cardTags, setCardTags] = useState<CardTag[]>([])
    const [deckTags, setDeckTags] = useState<DeckTag[]>([])

    useEffect(() => {
        fetchData<Query>(getTagsQuery).then((data) => {
            if (!data) throw new Error('No data from getTags')
            const result = data.data.tags
            if (!result) throw new Error('No result from getTags')
            const deckTags = result.filter((tag) => Object.keys(tag).includes('colors'))
            const cardTags = result.filter((tag) => !Object.keys(tag).includes('colors'))
            setCardTags(cardTags)
            setDeckTags(deckTags)
        })
    }, [])

    return <MTGTagsContext.Provider value={{ cardTags, deckTags }}>{children}</MTGTagsContext.Provider>
}
