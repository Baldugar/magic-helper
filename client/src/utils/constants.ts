import { FlowZone, MTG_Image } from '../graphql/types'

export const CARD_SIZE_VALUES: {
    [key in keyof MTG_Image]: { width: number; height: number }
} = {
    artCrop: { width: 100, height: 71 },
    borderCrop: { width: 100, height: 71 },
    large: { width: 672, height: 936 },
    normal: { width: 488, height: 680 },
    small: { width: 146, height: 204 },
    PNG: { width: 745, height: 1040 },
}

export const PAGE_SIZE_DESKTOP = 50
export const PAGE_SIZE_MOBILE = 10
export const DEFAULT_ZONE_DIMENSIONS = { width: 200, height: 200 }
export const DEFAULT_ZONE_POSITION = { x: 0, y: 0 }
export const DEFAULT_ZONE: FlowZone = {
    height: DEFAULT_ZONE_DIMENSIONS.height,
    width: DEFAULT_ZONE_DIMENSIONS.width,
    position: DEFAULT_ZONE_POSITION,
    ID: 'default',
    name: 'Default',
    childrenIDs: [],
}
