import { type GlossaryTerm, mergeMessage, problemFlags, runChecks, type Unit } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { all, eachRow, runAll } from "../../db/strings.ts"

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
  projectId: string
  fileId: number
  lang: string
  units: Unit[]
  credit: (key: string) => string | null
  glossary: GlossaryTerm[]
}

export const CONFLICT_NOTE = "changed in the repository meanwhile"

export async function applyTranslations(db: D1Database, input: TranslationInput) {
  const rows = await all<Row>(
    db
      .prepare(
        `SELECT s.id, s.key, s.hash, s.body source, t.body, t.base, t.by FROM source s
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
    if (merge.kind === "same") settled.push([row.id, repo])
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
      `INSERT INTO translation (source_id, lang, body, base, state, source_hash, flags, by, credit, at)
       SELECT j.value->>0, ?1, j.value->>1, j.value->>1, ${STATE.translated}, j.value->>2, j.value->>3, NULL, j.value->>4, ?2
       FROM json_each(?3) j WHERE true
       ON CONFLICT (source_id, lang) DO UPDATE SET body = excluded.body, base = excluded.base, state = excluded.state,
         source_hash = excluded.source_hash, flags = excluded.flags, by = NULL, credit = excluded.credit, at = excluded.at`,
      taken,
      input.lang,
      now,
    ),
    ...eachRow(
      db,
      "UPDATE translation SET base = j.value->>1 FROM json_each(?2) j WHERE source_id = j.value->>0 AND lang = ?1",
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
      `INSERT INTO activity (project_id, lang, source_id, user_id, kind, detail, at)
       SELECT ?1, ?2, j.value->>0, NULL, 'changed in the repository', j.value->>1, ?3 FROM json_each(?4) j`,
      history,
      input.projectId,
      input.lang,
      now,
    ),
  ])
  return taken.length + removed.length + conflicts.length > 0
}

export function clearSettled(db: D1Database, projectId: string, fileId: number, lang: string) {
  return db
    .prepare(
      `DELETE FROM pending WHERE project_id = ?1 AND file_id = ?2 AND lang = ?3 AND NOT EXISTS (
         SELECT 1 FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?3
         WHERE s.file_id = ?2 AND (t.base IS NULL OR t.base != t.body))`,
    )
    .bind(projectId, fileId, lang)
    .run()
}
