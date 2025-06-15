import { useContext } from 'react'
import { MTGTagsContext } from './MTGTagsContext'

export const useMTGTags = () => useContext(MTGTagsContext)
