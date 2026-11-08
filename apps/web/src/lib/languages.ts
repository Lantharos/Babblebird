export { englishName, nativeName } from "@babblebird/protocol"

export const percent = (part: number, whole: number) => (whole ? Math.floor((part / whole) * 100) : 0)
