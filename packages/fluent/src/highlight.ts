export interface Segment {
  text: string
  placeable: boolean
}

export function segments(source: string): Segment[] {
  const found: Segment[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === "{") {
      if (depth === 0 && index > start) found.push({ text: source.slice(start, index), placeable: false })
      if (depth === 0) start = index
      depth++
    } else if (char === "}" && depth > 0) {
      depth--
      if (depth === 0) {
        found.push({ text: source.slice(start, index + 1), placeable: true })
        start = index + 1
      }
    }
  }
  if (start < source.length) found.push({ text: source.slice(start), placeable: depth > 0 })
  return found
}

export function placeablesOf(source: string) {
  return segments(source)
    .filter((segment) => segment.placeable)
    .map((segment) => segment.text)
}
