import { FluentParser, FluentSerializer, GroupComment, Junk, Message, Term } from "@fluent/syntax"
import { hash53 } from "./hash.ts"
import { plainOf } from "./plain.ts"

export interface Unit {
  key: string
  body: string
  hash: number
  comment: string | null
  section: string | null
  plain: string
}

export interface ReadFile {
  units: Unit[]
  broken: string[]
}

const parser = new FluentParser({ withSpans: true })
const serializer = new FluentSerializer()

const keyOf = (entry: Message | Term) => (entry instanceof Term ? `-${entry.id.name}` : entry.id.name)

export function bodyHash(entry: Message | Term) {
  const comment = entry.comment
  entry.comment = null
  const normal = serializer.serializeEntry(entry)
  entry.comment = comment
  return hash53(normal.slice(normal.indexOf("=")))
}

export function readFile(text: string): ReadFile {
  const units: Unit[] = []
  const broken: string[] = []
  let section: string | null = null
  for (const entry of parser.parse(text).body) {
    if (entry instanceof GroupComment) section = entry.content.trim() || null
    else if (entry instanceof Junk) broken.push(entry.content.trim().split("\n")[0] ?? "")
    else if (entry instanceof Message || entry instanceof Term) {
      const keyEnd = entry.id.span!.end
      units.push({
        key: keyOf(entry),
        body: text.slice(keyEnd, entry.span!.end).trim(),
        hash: bodyHash(entry),
        comment: entry.comment?.content.trim() || null,
        section,
        plain: plainOf(entry),
      })
    }
  }
  return { units, broken }
}

interface Spot {
  start: number
  keyEnd: number
  end: number
}

function spotsOf(text: string) {
  const spots = new Map<string, Spot>()
  for (const entry of parser.parse(text).body)
    if (entry instanceof Message || entry instanceof Term)
      spots.set(keyOf(entry), { start: entry.span!.start, keyEnd: entry.id.span!.end, end: entry.span!.end })
  return spots
}

export function patchMessages(existing: string, order: string[], changes: Map<string, string>) {
  const spots = spotsOf(existing)
  const edits: { at: number; to: number; text: string }[] = []
  const inserts = new Map<number, string[]>()
  let anchor = -1
  for (const key of order) {
    const body = changes.get(key)
    const spot = spots.get(key)
    if (spot) {
      if (body !== undefined && existing.slice(spot.keyEnd, spot.end).trim() !== body)
        edits.push({ at: spot.keyEnd, to: spot.end, text: ` ${body}` })
      anchor = spot.end
    } else if (body !== undefined) inserts.set(anchor, [...(inserts.get(anchor) ?? []), `${key} ${body}`])
  }
  for (const [at, lines] of inserts)
    edits.push(
      at < 0
        ? { at: 0, to: 0, text: `${lines.join("\n")}\n` }
        : { at, to: at, text: `\n${lines.join("\n")}` },
    )
  let text = existing
  for (const edit of edits.sort((a, b) => b.at - a.at))
    text = text.slice(0, edit.at) + edit.text + text.slice(edit.to)
  return text && !text.endsWith("\n") ? `${text}\n` : text
}

export function messagesOf(text: string) {
  const found = new Map<string, string>()
  for (const [key, spot] of spotsOf(text)) found.set(key, text.slice(spot.keyEnd, spot.end).trim())
  return found
}
