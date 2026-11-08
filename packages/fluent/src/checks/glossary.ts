export interface GlossaryTerm {
  term: string
  translation: string | null
  note: string | null
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function termPattern(term: string, exact = false) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped(term)}(?![\\p{L}\\p{N}])`, exact ? "u" : "iu")
}

export function termsIn(text: string, glossary: GlossaryTerm[]) {
  return glossary.filter((entry) => termPattern(entry.term).test(text))
}

const STEM = 4

export function usesTranslation(text: string, translation: string) {
  const lower = text.toLowerCase()
  return translation
    .toLowerCase()
    .split(/\s+/)
    .every((word) =>
      lower.includes(word.length > STEM + 1 ? word.slice(0, Math.max(STEM, word.length - 2)) : word),
    )
}
