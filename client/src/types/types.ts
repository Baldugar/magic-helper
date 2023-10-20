import { COLOR, FORMAT, LAYOUT, LEGALITY, RARITY } from './enums'

export type MCOLOR = COLOR | 'M'

export type ImageUris = {
    art_crop: string
    border_crop: string
    large: string
    normal: string
    png: string
    small: string
}

export type CardFace = {
    color_indicator?: MCOLOR[]
    colors?: MCOLOR[]
    flavor_text?: string
    image_uris?: ImageUris
    loyalty?: string
    mana_cost?: string
    name: string
    oracle_text?: string
    power?: string
    toughness?: string
    type_line: string
}

export type MTGACard = {
    cmc: number
    colors?: MCOLOR[]
    color_identity: MCOLOR[]
    flavor_text?: string
    id: string
    layout: LAYOUT
    legalities: Record<FORMAT, LEGALITY>
    loyalty?: string
    mana_cost?: string
    name: string
    oracle_text?: string
    power?: string
    produced_mana?: MCOLOR[]
    rarity: RARITY
    set: string
    set_name: string
    toughness?: string
    type_line: string
    image_uris?: ImageUris
    card_faces?: CardFace[]
}
