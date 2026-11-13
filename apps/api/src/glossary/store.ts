import type { GlossaryRow } from "@babblebird/protocol"
import type { PendingFile } from "../deliver/files.ts"
import type { Db } from "../strings/db.ts"
import { patchTbx, type TermChange } from "../sync/import/tbx.ts"

export const DEFAULT_GLOSSARY = "glossary/{lang}.tbx"

export interface TermEdit {
  lang: string
  term: string
  translation: string | null
  note: string | null
  userId: string
}

export function glossaryRows(db: Db, lang: string) {
  return db
    .all<{ term: string; translation: string | null; note: string | null; unsent: number }>(
      "SELECT term, translation, note, unsent FROM glossary WHERE lang = ? AND NOT deleted ORDER BY term COLLATE NOCASE",
      lang,
    )
    .map((row): GlossaryRow => ({ ...row, unsent: row.unsent === 1 }))
}

function glossaryFile(db: Db) {
  return (
    db.one<{ id: number }>("SELECT id FROM file WHERE area_id = 0 LIMIT 1") ??
    db.one<{ id: number }>(
      "INSERT INTO file (area_id, pattern, position) VALUES (0, ?, 0) RETURNING id",
      DEFAULT_GLOSSARY,
    )!
  ).id
}

function touched(db: Db, lang: string, term: string, userId: string) {
  const now = Date.now()
  db.run(
    `INSERT INTO pending (file_id, lang, since, changed) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT (file_id, lang) DO UPDATE SET changed = excluded.changed`,
    glossaryFile(db),
    lang,
    now,
  )
  db.run(
    "INSERT INTO activity (lang, source_id, user_id, kind, detail, at) VALUES (?, NULL, ?, 'updated the glossary', ?, ?)",
    lang,
    userId,
    term,
    now,
  )
}

export function saveTerm(db: Db, edit: TermEdit) {
  db.run(
    `INSERT INTO glossary (lang, term, translation, note, unsent, deleted, in_repo) VALUES (?, ?, ?, ?, 1, 0, 0)
     ON CONFLICT (lang, term) DO UPDATE SET translation = excluded.translation, note = excluded.note, unsent = 1, deleted = 0`,
    edit.lang,
    edit.term,
    edit.translation,
    edit.note,
  )
  touched(db, edit.lang, edit.term, edit.userId)
}

export function dropTerm(db: Db, lang: string, term: string, userId: string) {
  const row = db.one<{ in_repo: number }>(
    "SELECT in_repo FROM glossary WHERE lang = ? AND term = ?",
    lang,
    term,
  )
  if (!row) return false
  if (row.in_repo)
    db.run("UPDATE glossary SET deleted = 1, unsent = 1 WHERE lang = ? AND term = ?", lang, term)
  else db.run("DELETE FROM glossary WHERE lang = ? AND term = ?", lang, term)
  touched(db, lang, term, userId)
  return true
}

export function buildGlossary(db: Db, file: PendingFile, existing: string, sourceLang: string) {
  const changes = db.all<TermChange>(
    "SELECT term, translation, note, deleted FROM glossary WHERE lang = ? AND unsent ORDER BY term",
    file.lang,
  )
  if (!changes.length) return null
  const content = patchTbx(existing, sourceLang, file.lang, changes)
  if (content === existing) return null
  return { pattern: file.pattern, lang: file.lang, path: file.pattern.replace("{lang}", file.lang), content }
}
