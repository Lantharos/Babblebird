import { type GlossaryTerm, mergeMessage, problemFlags, runChecks, type Unit } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { all, eachRow, runAll, type Strings } from "../../strings/client.ts"

interface Row {
  id: number
  key: string
  hash: number
  source: string
  body: string | null
  base: string | null
  by: string | null
}

export interface TranslationInput {
  fileId: number
  lang: string
  units: Unit[]
  credit: (key: string) => string | null
  glossary: GlossaryTerm[]
}

export const CONFLICT_NOTE = "changed in the repository meanwhile"

export async function applyTranslations(db: Strings, input: TranslationInput) {
  const rows = await all<Row>(
    db
      .prepare(
        `SELECT s.id, s.key, s.hash, s.body source, t.body, iif(t.unsent, t.base, t.body) base, t.by FROM source s
         LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2 WHERE s.file_id = ?1`,
      )
      .bind(input.fileId, input.lang),
  )
  const theirs = new Map<string, string>()
  for (const unit of input.units) if (!theirs.has(unit.key)) theirs.set(unit.key, unit.body)
  const now = Date.now()
  const taken: unknown[][] = []
  const settled: unknown[][] = []
  const removed: unknown[][] = []
  const conflicts: unknown[][] = []
  const history: unknown[][] = []
  for (const row of rows) {
    const repo = theirs.get(row.key) ?? null
    if (row.body === null ? repo === null : row.base === repo) continue
    const merge = mergeMessage(row.base, row.body, repo)
    if (merge.kind === "same") settled.push([row.id])
    else if (merge.kind === "conflict" || merge.kind === "theirs") {
      if (merge.kind === "conflict" && row.by) conflicts.push([row.id, row.body, row.by])
      if (repo === null) removed.push([row.id])
      else {
        const flags = problemFlags(runChecks(row.source, repo, input.lang, input.glossary))
        taken.push([row.id, repo, row.hash, flags, input.credit(row.key)])
      }
      if (row.body !== null) history.push([row.id, repo])
    }
  }
  await runAll(db, [
    ...eachRow(
      db,
      "INSERT OR IGNORE INTO credit (names) SELECT DISTINCT j.value->>4 FROM json_each(?1) j WHERE j.value->>4 IS NOT NULL",
      taken,
    ),
    ...eachRow(
      db,
      `INSERT INTO translation (source_id, lang, body, base, unsent, state, source_hash, flags, by, credit_id, at)
       SELECT j.value->>0, ?1, j.value->>1, NULL, 0, ${STATE.translated}, j.value->>2, j.value->>3, NULL,
         (SELECT id FROM credit WHERE names = j.value->>4), ?2
       FROM json_each(?3) j WHERE true
       ON CONFLICT (source_id, lang) DO UPDATE SET body = excluded.body, base = NULL, unsent = 0, state = excluded.state,
         source_hash = excluded.source_hash, flags = excluded.flags, by = NULL, credit_id = excluded.credit_id, at = excluded.at`,
      taken,
      input.lang,
      now,
    ),
    ...eachRow(
      db,
      "UPDATE translation SET base = NULL, unsent = 0 WHERE lang = ?1 AND source_id IN (SELECT j.value->>0 FROM json_each(?2) j)",
      settled,
      input.lang,
    ),
    ...eachRow(
      db,
      "DELETE FROM translation WHERE lang = ?1 AND source_id IN (SELECT j.value->>0 FROM json_each(?2) j)",
      removed,
      input.lang,
    ),
    ...eachRow(
      db,
      `INSERT INTO suggestion (source_id, lang, body, by, at, note)
       SELECT j.value->>0, ?1, j.value->>1, j.value->>2, ?2, '${CONFLICT_NOTE}' FROM json_each(?3) j`,
      conflicts,
      input.lang,
      now,
    ),
    ...eachRow(
      db,
      `INSERT INTO activity (lang, source_id, user_id, kind, detail, at)
       SELECT ?1, j.value->>0, NULL, 'changed in the repository', j.value->>1, ?2 FROM json_each(?3) j`,
      history,
      input.lang,
      now,
    ),
  ])
  return taken.length + removed.length + conflicts.length > 0
}

export function clearSettled(db: Strings, fileId: number, lang: string) {
  return db
    .prepare(
      `DELETE FROM pending WHERE file_id = ?1 AND lang = ?2 AND NOT EXISTS (
         SELECT 1 FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?2
         WHERE s.file_id = ?1 AND t.unsent = 1)`,
    )
    .bind(fileId, lang)
}
