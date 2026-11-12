export interface GlossaryTerm {
  term: string
  translation: string | null
  note: string | null
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function termPattern(term: string, name = false) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped(term)}(?![\\p{L}\\p{N}])`, name ? "u" : "iu")
}

export function keepsTerm(text: string, term: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped(term)}`, "u").test(text)
}

export function termsIn(text: string, glossary: GlossaryTerm[]) {
  return glossary.filter((entry) => termPattern(entry.term, entry.translation === null).test(text))
}

const wordsOf = (text: string) => text.toLowerCase().match(/\p{L}+/gu) ?? []

const stemOf = (word: string) => word.slice(0, Math.max(3, Math.ceil(word.length * 0.6)))

export function usesTranslation(text: string, translation: string) {
  const words = wordsOf(text.replace(/\{[^}]*\}/g, " "))
  return wordsOf(translation).every((wanted) => words.some((word) => word.includes(stemOf(wanted))))
}
