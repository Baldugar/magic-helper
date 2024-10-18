import { MTGA_Card, MTGA_Image } from '../../graphql/types'

export const getCorrectCardImage = (card: MTGA_Card, size: keyof MTGA_Image, other?: boolean) => {
    switch (card.layout) {
        case 'normal':
        case 'class':
        case 'saga':
        case 'split':
        case 'adventure':
        case 'prototype':
        case 'mutate':
        case 'meld':
        case 'case':
            return other ? undefined : card.image![size]
        case 'modal_dfc':
        case 'transform':
            return card.cardFaces![other ? 1 : 0].image![size]
    }
}
