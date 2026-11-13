import { type GlossaryTerm, mergeMessage, problemFlags, runChecks, type Unit } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import type { Db } from "../../strings/db.ts"

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
  credits: Map<string, string>
  credit: string | null
}

export const CONFLICT_NOTE = "changed in the repository meanwhile"

export const REPOSITORY_VALUE = "iif(t.unsent, t.base, t.body)"

export function glossaryOf(db: Db, lang: string) {
  return db.all<GlossaryTerm>(
    "SELECT term, translation, note FROM glossary WHERE lang = ? AND NOT deleted",
    lang,
  )
}

function creditId(db: Db, names: string | null) {
  if (!names) return null
  db.run("INSERT OR IGNORE INTO credit (names) VALUES (?)", names)
  return db.one<{ id: number }>("SELECT id FROM credit WHERE names = ?", names)!.id
}

export function applyTranslations(db: Db, input: TranslationInput, glossary: GlossaryTerm[]) {
  const rows = db.all<Row>(
    `SELECT s.id, s.key, s.hash, s.body source, t.body, ${REPOSITORY_VALUE} base, t.by FROM source s
     LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2 WHERE s.file_id = ?1`,
    input.fileId,
    input.lang,
  )
  const theirs = new Map<string, string>()
  for (const unit of input.units) if (!theirs.has(unit.key)) theirs.set(unit.key, unit.body)
  const now = Date.now()
  let changed = false
  for (const row of rows) {
    const repo = theirs.get(row.key) ?? null
    if (row.body === null ? repo === null : row.base === repo) continue
    const merge = mergeMessage(row.base, row.body, repo)
    if (merge.kind === "same") {
      db.run(
        "UPDATE translation SET base = NULL, unsent = 0 WHERE source_id = ? AND lang = ?",
        row.id,
        input.lang,
      )
      continue
    }
    if (merge.kind === "ours") continue
    changed = true
    if (merge.kind === "conflict" && row.by)
      db.run(
        "INSERT INTO suggestion (source_id, lang, body, by, at, note) VALUES (?, ?, ?, ?, ?, ?)",
        row.id,
        input.lang,
        row.body,
        row.by,
        now,
        CONFLICT_NOTE,
      )
    if (repo === null) db.run("DELETE FROM translation WHERE source_id = ? AND lang = ?", row.id, input.lang)
    else
      db.run(
        `INSERT INTO translation (source_id, lang, body, base, unsent, state, source_hash, flags, by, credit_id, at)
         VALUES (?1, ?2, ?3, NULL, 0, ${STATE.translated}, ?4, ?5, NULL, ?6, ?7)
         ON CONFLICT (source_id, lang) DO UPDATE SET body = excluded.body, base = NULL, unsent = 0, state = excluded.state,
           source_hash = excluded.source_hash, flags = excluded.flags, by = NULL, credit_id = excluded.credit_id, at = excluded.at`,
        row.id,
        input.lang,
        repo,
        row.hash,
        problemFlags(runChecks(row.source, repo, input.lang, glossary)),
        creditId(db, input.credits.get(row.key) ?? input.credit),
        now,
      )
    if (row.body !== null)
      db.run(
        "INSERT INTO activity (lang, source_id, user_id, kind, detail, at) VALUES (?, ?, NULL, 'changed in the repository', ?, ?)",
        input.lang,
        row.id,
        repo,
        now,
      )
  }
  return changed
}

export function clearSettled(db: Db, fileId: number, lang: string) {
  db.run(
    `DELETE FROM pending WHERE file_id = ?1 AND lang = ?2 AND NOT EXISTS (
       SELECT 1 FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?2
       WHERE s.file_id = ?1 AND t.unsent = 1)`,
    fileId,
    lang,
  )
}
