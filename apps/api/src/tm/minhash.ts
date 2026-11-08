import { hash53 } from "@babblebird/fluent"

const HASHES = 8
const ROWS_PER_BAND = 2
const SEEDS = Array.from({ length: HASHES }, (_, index) => 0x9e3779b1 * (index + 1))
const MIN_LENGTH = 4

export function normalized(plain: string) {
  return plain
    .toLowerCase()
    .replace(/\{[^}]*\}/g, "§")
    .replace(/\s+/g, " ")
    .trim()
}

export function trigrams(text: string) {
  const padded = ` ${text} `
  const found = new Set<string>()
  for (let index = 0; index + 3 <= padded.length; index++) found.add(padded.slice(index, index + 3))
  return found
}

export function bandsOf(plain: string) {
  const text = normalized(plain)
  if (text.length < MIN_LENGTH) return []
  const shingles = [...trigrams(text)]
  const minimums = SEEDS.map((seed) => {
    let min = Number.MAX_SAFE_INTEGER
    for (const shingle of shingles) min = Math.min(min, hash53(shingle, seed))
    return min
  })
  const bands: number[] = []
  for (let band = 0; band < HASHES / ROWS_PER_BAND; band++)
    bands.push(
      hash53(`${band}:${minimums.slice(band * ROWS_PER_BAND, (band + 1) * ROWS_PER_BAND).join(":")}`),
    )
  return bands
}

export function similarity(a: string, b: string) {
  const left = trigrams(normalized(a))
  const right = trigrams(normalized(b))
  let shared = 0
  for (const gram of left) if (right.has(gram)) shared++
  return (2 * shared) / (left.size + right.size || 1)
}

export const textHash = (plain: string) => hash53(plain.toLowerCase().replace(/\s+/g, " ").trim())
