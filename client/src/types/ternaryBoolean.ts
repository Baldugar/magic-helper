export enum TernaryBoolean {
    UNSET = 0,
    TRUE = 1,
    FALSE = 2,
}

export const nextTB = (current: TernaryBoolean | undefined): TernaryBoolean => {
    return current ? (current + 1) % 3 : TernaryBoolean.TRUE
}

export const prevTB = (current: TernaryBoolean | undefined): TernaryBoolean => {
    return current ? (current + 2) % 3 : TernaryBoolean.FALSE
}

export const isUnsetTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.UNSET
export const isNotUnsetTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.UNSET
export const isPositiveTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.TRUE
export const isNotPositiveTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.TRUE
export const isNegativeTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.FALSE
export const isNotNegativeTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.FALSE
