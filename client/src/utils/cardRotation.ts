export enum Rotate {
    rotate0 = 0,
    rotate90 = 90,
    rotate180 = 180,
    rotate270 = 270,
}

export const nextRotate = (currentTotal: number): { visual: Rotate; total: number } => {
    const newTotal = currentTotal + 90
    return {
        visual: (newTotal % 360) as Rotate,
        total: newTotal,
    }
}

export const prevRotate = (currentTotal: number): { visual: Rotate; total: number } => {
    const newTotal = currentTotal - 90
    return {
        visual: (newTotal % 360) as Rotate,
        total: newTotal,
    }
}

export const applyRotate = (totalRotation: number, element: HTMLElement | null): void => {
    if (element) {
        element.style.transform = `rotate(${totalRotation}deg)`
    }
}
