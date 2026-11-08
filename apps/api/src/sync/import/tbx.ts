import type { GlossaryTerm } from "@babblebird/fluent"

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }

const decode = (text: string) =>
  text
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, name: string) => {
      if (name.startsWith("#x")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
      if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)))
      return ENTITIES[name] ?? whole
    })
    .trim()

const inner = (block: string, tag: string) => {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(block)
  return match ? decode(match[1]!) : null
}

export function readTbx(xml: string, source: string, lang: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = []
  for (const [entry] of xml.matchAll(/<termEntry\b[\s\S]*?<\/termEntry>/g)) {
    const sets = new Map(
      [...entry.matchAll(/<langSet\b[^>]*xml:lang="([^"]+)"[^>]*>([\s\S]*?)<\/langSet>/g)].map((set) => [
        set[1]!,
        set[2]!,
      ]),
    )
    const original = sets.get(source)
    const term = original && inner(original, "term")
    if (!term) continue
    const translated = sets.get(lang)
    const keep = /<descrip type="Translation needed">\s*No\s*</i.test(entry)
    const translation = translated ? inner(translated, "term") : null
    if (!keep && !translation) continue
    terms.push({
      term,
      translation: keep ? null : translation,
      note: (translated && inner(translated, "note")) ?? inner(original, "note"),
    })
  }
  return terms
}
