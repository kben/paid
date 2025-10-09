/** asserts that the given string does not exceed the given length and returns the string */
export const varchar = (str: string | undefined | null, maxLength: number): string | undefined => {
    if (str == undefined) { return undefined }

    if (str.length > maxLength) {
        console.error(`"${str}" exceeds maximum field length of ${maxLength}`)
    }
    return str
}

/** asserts that the given string exactly matches the given length and returns the string */
export const char = (str: string | undefined | null, length: number): string | undefined => {
    if (str == undefined) { return undefined }

    if (str.length != length) {
        console.error(`"${str}" did not match required length of ${length}`)
    }
    return str
}

/** asserts that the given value is an int in the given range and returns the value as a string */
export const int = (value: number | undefined | null, min: number, max: number): string | undefined => {
    if (value == undefined) { return undefined }

    if (!Number.isInteger(value)) {
        console.error(`"${value}" must be an integer`)
    }
    if (value < min || value > max) {
        console.error(`"${value}" is out of bounds of ${min}..${max}`)
    }
    return value.toString()
}

/** asserts that the given value is an int and returns the value as a string of fixed length (prefixes value with 0s if necessary) */
export const fixedInt = (value: number | undefined | null, length: number): string | undefined => {
    if (value == undefined) { return undefined }

    if (!Number.isInteger(value)) {
        console.error(`"${value}" must be an integer`)
    }
    if (value.toString().length > length) {
        console.error(`"${value}" must be not longer than ${length}`)
    }
    return value.toString().padStart(length, "0")
}

export const decimal = (value: number | undefined | null, preDecimalPlaceCount: number, decimalPlaceCount: number): string | undefined => {
    if (value == undefined) { return undefined }

    const num = value.toLocaleString("de-DE", {
        minimumFractionDigits: decimalPlaceCount,
        maximumFractionDigits: decimalPlaceCount,
        useGrouping: false
    })
    if (num.length > preDecimalPlaceCount + decimalPlaceCount + 1 + (value < 0 ? 1 : 0)) {
        console.error(`"${value}" must be not longer than ${preDecimalPlaceCount},${decimalPlaceCount}`)
    }
    return num
}
