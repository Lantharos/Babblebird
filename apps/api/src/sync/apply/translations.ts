import { type GlossaryTerm, problemFlags, runChecks, type Unit } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { all, eachRow, runAll } from "../../db/strings.ts"

interface Row {
  id: number
  key: string
  hash: number
  source: string
  body: string | null
  by: string | null
  at: number | null
}

export interface TranslationInput {
  fileId: number
  lang: string
  units: Unit[]
  credit: (key: string) => string | null
  keepSince: number | null
  glossary: GlossaryTerm[]
}

export async function applyTranslations(db: D1Database, input: TranslationInput) {
  const rows = await all<Row>(
    db
      .prepare(
        `SELECT s.id, s.key, s.hash, s.body source, t.body, t.by, t.at FROM source s
         LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2 WHERE s.file_id = ?1`,
      )
      .bind(input.fileId, input.lang),
  )
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const kept = (row: Row) => input.keepSince !== null && row.by !== null && (row.at ?? 0) >= input.keepSince
  const now = Date.now()
  const written: unknown[][] = []
  const seen = new Set<string>()
  for (const unit of input.units) {
    const row = byKey.get(unit.key)
    if (!row || seen.has(unit.key)) continue
    seen.add(unit.key)
    if (row.body === unit.body || (row.body !== null && kept(row))) continue
    const flags = problemFlags(runChecks(row.source, unit.body, input.lang, input.glossary))
    written.push([row.id, unit.body, row.hash, flags, input.credit(unit.key), now])
  }
  const removed = rows
    .filter((row) => row.body !== null && !seen.has(row.key) && !kept(row))
    .map((row) => [row.id])
  await runAll(db, [
    ...eachRow(
      db,
      `INSERT INTO translation (source_id, lang, body, state, source_hash, flags, by, credit, at)
       SELECT j.value->>0, ?1, j.value->>1, ${STATE.translated}, j.value->>2, j.value->>3, NULL, j.value->>4, j.value->>5
       FROM json_each(?2) j WHERE true
       ON CONFLICT (source_id, lang) DO UPDATE SET body = excluded.body, state = excluded.state,
         source_hash = excluded.source_hash, flags = excluded.flags, by = NULL, credit = excluded.credit, at = excluded.at`,
      written,
      input.lang,
    ),
    ...eachRow(
      db,
      "DELETE FROM translation WHERE lang = ?1 AND source_id IN (SELECT j.value->>0 FROM json_each(?2) j)",
      removed,
      input.lang,
    ),
  ])
  return written.length + removed.length > 0
}
