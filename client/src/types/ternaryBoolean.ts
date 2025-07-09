import { TernaryBoolean } from '../graphql/types'

export const nextTB = (current: TernaryBoolean | undefined): TernaryBoolean => {
    return current
        ? current === TernaryBoolean.TRUE
            ? TernaryBoolean.FALSE
            : current === TernaryBoolean.FALSE
            ? TernaryBoolean.UNSET
            : TernaryBoolean.TRUE
        : TernaryBoolean.TRUE
}

export const prevTB = (current: TernaryBoolean | undefined): TernaryBoolean => {
    return current
        ? current === TernaryBoolean.TRUE
            ? TernaryBoolean.UNSET
            : current === TernaryBoolean.FALSE
            ? TernaryBoolean.TRUE
            : TernaryBoolean.FALSE
        : TernaryBoolean.FALSE
}

export const isUnsetTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.UNSET
export const isNotUnsetTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.UNSET
export const isPositiveTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.TRUE
export const isNotPositiveTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.TRUE
export const isNegativeTB = (value: TernaryBoolean): boolean => value === TernaryBoolean.FALSE
export const isNotNegativeTB = (value: TernaryBoolean): boolean => value !== TernaryBoolean.FALSE
