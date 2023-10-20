export enum TernaryBoolean {
    UNSET = -1,
    FALSE = 0,
    TRUE = 1,
}

export const nextTB = (current: TernaryBoolean): TernaryBoolean => {
    switch (current) {
        case TernaryBoolean.TRUE:
            return TernaryBoolean.FALSE
        case TernaryBoolean.FALSE:
            return TernaryBoolean.UNSET
        case TernaryBoolean.UNSET:
            return TernaryBoolean.TRUE
        default:
            throw new Error('Invalid TernaryBoolean value')
    }
}

export const prevTB = (current: TernaryBoolean): TernaryBoolean => {
    switch (current) {
        case TernaryBoolean.TRUE:
            return TernaryBoolean.UNSET
        case TernaryBoolean.FALSE:
            return TernaryBoolean.TRUE
        case TernaryBoolean.UNSET:
            return TernaryBoolean.FALSE
        default:
            throw new Error('Invalid TernaryBoolean value')
    }
}

export const isUnsetTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.UNSET
export const isNotUnsetTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.UNSET
export const isPositiveTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.TRUE
export const isNotPositiveTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.TRUE
export const isNegativeTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.FALSE
export const isNotNegativeTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.FALSE
