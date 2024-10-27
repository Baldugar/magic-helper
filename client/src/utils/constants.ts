import { MTGA_Image } from '../graphql/types'

export const CARD_SIZE_VALUES: {
    [key in keyof MTGA_Image]: { width: number; height: number }
} = {
    artCrop: { width: 100, height: 71 },
    borderCrop: { width: 100, height: 71 },
    large: { width: 100, height: 71 },
    normal: { width: 488, height: 680 },
    small: { width: 146, height: 204 },
    png: { width: 745, height: 1040 },
}

export const PAGE_SIZE = 50
