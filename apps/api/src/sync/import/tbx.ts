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

export interface TermChange {
  term: string
  translation: string | null
  note: string | null
  deleted: number
}

const ENTRY = /^[ \t]*<termEntry\b[\s\S]*?<\/termEntry>[ \t]*\n?/gm

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function sourceTerm(entry: string, source: string) {
  const set = new RegExp(`<langSet\\b[^>]*xml:lang="${source}"[^>]*>([\\s\\S]*?)</langSet>`).exec(entry)
  return set ? inner(set[1]!, "term") : null
}

function entryXml(id: string | number, source: string, lang: string, change: TermChange) {
  const kept = change.translation === null
  return [
    `      <termEntry id="${id}">`,
    ...(kept ? ['        <descrip type="Translation needed">No</descrip>'] : []),
    `        <langSet xml:lang="${source}">`,
    "          <tig>",
    `            <term>${escape(change.term)}</term>`,
    "          </tig>",
    "        </langSet>",
    `        <langSet xml:lang="${lang}">`,
    "          <tig>",
    `            <term>${escape(change.translation ?? change.term)}</term>`,
    ...(change.note ? [`            <note from="translator">${escape(change.note)}</note>`] : []),
    "          </tig>",
    "        </langSet>",
    "      </termEntry>",
    "",
  ].join("\n")
}

const skeleton = (source: string, lang: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE martif PUBLIC "ISO 12200:1999A//DTD MARTIF core (DXFcdV04)//EN" "TBXcdv04.dtd">
<martif type="TBX" xml:lang="${source}">
  <martifHeader>
    <fileDesc>
      <sourceDesc>
        <p>Glossary for ${lang}</p>
      </sourceDesc>
    </fileDesc>
  </martifHeader>
  <text>
    <body>
    </body>
  </text>
</martif>
`

export function patchTbx(xml: string, source: string, lang: string, changes: TermChange[]) {
  let result = xml.trim() ? xml : skeleton(source, lang)
  const ids = [...result.matchAll(/<termEntry\b[^>]*\bid="(\d+)"/g)].map((match) => Number(match[1]))
  let next = Math.max(0, ...ids) + 1
  for (const change of changes) {
    const found = [...result.matchAll(ENTRY)].find((match) => sourceTerm(match[0], source) === change.term)
    if (found) {
      const id = /<termEntry\b[^>]*\bid="([^"]*)"/.exec(found[0])?.[1] ?? next++
      const replacement = change.deleted ? "" : entryXml(id, source, lang, change)
      result = result.slice(0, found.index) + replacement + result.slice(found.index + found[0].length)
    } else if (!change.deleted)
      result = result.replace(
        /^([ \t]*)<\/body>/m,
        (closing) => `${entryXml(next++, source, lang, change)}${closing}`,
      )
  }
  return result
}
