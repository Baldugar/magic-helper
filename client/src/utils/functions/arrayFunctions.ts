// Function to deeply copy arrays
export const deepCopy = <T>(arr: T[]): T[] => {
    return JSON.parse(JSON.stringify(arr))
}
