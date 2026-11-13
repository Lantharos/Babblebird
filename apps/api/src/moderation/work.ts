import { type GlossaryTerm, problemFlags, runChecks } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import type { Db } from "../strings/db.ts"
import { recount } from "../sync/apply/progress.ts"
import { clearSettled, glossaryOf } from "../sync/apply/translations.ts"

interface Changed {
  source_id: number
  lang: string
  base: string | null
  source: string
  file_id: number
  area_id: number
}

interface Suggested {
  id: number
  lang: string
  area_id: number
}

function changedBy(db: Db, userId: string) {
  return db.all<Changed>(
    `SELECT t.source_id, t.lang, t.base, s.body source, s.file_id, f.area_id
     FROM (SELECT DISTINCT source_id, lang FROM activity WHERE user_id = ?1 AND source_id IS NOT NULL) a
     JOIN translation t ON t.source_id = a.source_id AND t.lang = a.lang
     JOIN source s ON s.id = t.source_id JOIN file f ON f.id = s.file_id
     WHERE t.by = ?1 AND t.unsent = 1`,
    userId,
  )
}

function suggestedBy(db: Db, userId: string) {
  return db.all<Suggested>(
    `SELECT g.id, g.lang, f.area_id FROM suggestion g
     JOIN source s ON s.id = g.source_id JOIN file f ON f.id = s.file_id WHERE g.by = ?1`,
    userId,
  )
}

function restore(db: Db, row: Changed, glossary: GlossaryTerm[], now: number) {
  if (row.base === null) {
    db.run("DELETE FROM translation WHERE source_id = ? AND lang = ?", row.source_id, row.lang)
    return
  }
  db.run(
    `UPDATE translation SET body = ?3, base = NULL, unsent = 0, state = ${STATE.translated}, flags = ?4,
       by = NULL, credit_id = NULL, at = ?5 WHERE source_id = ?1 AND lang = ?2`,
    row.source_id,
    row.lang,
    row.base,
    problemFlags(runChecks(row.source, row.base, row.lang, glossary)),
    now,
  )
}

export function removeWork(db: Db, userId: string) {
  const changed = changedBy(db, userId)
  const suggested = suggestedBy(db, userId)
  const now = Date.now()
  const glossaries = new Map<string, GlossaryTerm[]>()
  for (const row of changed) {
    if (!glossaries.has(row.lang)) glossaries.set(row.lang, glossaryOf(db, row.lang))
    restore(db, row, glossaries.get(row.lang)!, now)
    db.run(
      "INSERT INTO activity (lang, source_id, user_id, kind, detail, at) VALUES (?, ?, NULL, 'reverted', ?, ?)",
      row.lang,
      row.source_id,
      row.base,
      now,
    )
  }
  for (const row of suggested) db.run("DELETE FROM suggestion WHERE id = ?", row.id)
  for (const row of new Map(changed.map((row) => [`${row.file_id}:${row.lang}`, row])).values()) {
    clearSettled(db, row.file_id, row.lang)
    db.run("UPDATE pending SET changed = ? WHERE file_id = ? AND lang = ?", now, row.file_id, row.lang)
  }
  for (const [areaId, group] of Map.groupBy([...changed, ...suggested], (row) => row.area_id))
    recount(db, areaId, [...new Set(group.map((row) => row.lang))])
  return { translations: changed.length, suggestions: suggested.length }
}
