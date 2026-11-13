import type { Db } from "../strings/db.ts"

export const ENGLISH = ""

export interface CommentRow {
  id: number
  lang: string
  user_id: string
  body: string
  at: number
}

export interface ThreadRows {
  lang: string
  resolved: { at: number; by: string } | null
  comments: CommentRow[]
}

export function threadsFor(db: Db, sourceId: number, lang: string): ThreadRows[] {
  const comments = db.all<CommentRow>(
    "SELECT id, lang, user_id, body, at FROM comment WHERE source_id = ?1 AND lang IN (?2, '') ORDER BY id",
    sourceId,
    lang,
  )
  const resolved = new Map(
    db
      .all<{ lang: string; at: number; by: string }>(
        "SELECT lang, at, by FROM resolved_thread WHERE source_id = ?1 AND lang IN (?2, '')",
        sourceId,
        lang,
      )
      .map((row) => [row.lang, { at: row.at, by: row.by }]),
  )
  return [...Map.groupBy(comments, (comment) => comment.lang)].map(([threadLang, items]) => ({
    lang: threadLang,
    resolved: resolved.get(threadLang) ?? null,
    comments: items,
  }))
}

export interface NewComment {
  sourceId: number
  lang: string
  userId: string
  body: string
}

export function addComment(db: Db, input: NewComment) {
  const source = db.one<{ key: string; area: string }>(
    "SELECT s.key, a.slug area FROM source s JOIN file f ON f.id = s.file_id JOIN area a ON a.id = f.area_id WHERE s.id = ?",
    input.sourceId,
  )
  if (!source) return null
  const participants = db
    .all<{ user_id: string }>(
      "SELECT DISTINCT user_id FROM comment WHERE source_id = ? AND lang = ? AND user_id != ?",
      input.sourceId,
      input.lang,
      input.userId,
    )
    .map((row) => row.user_id)
  db.run(
    "INSERT INTO comment (source_id, lang, user_id, body, at) VALUES (?, ?, ?, ?, ?)",
    input.sourceId,
    input.lang,
    input.userId,
    input.body,
    Date.now(),
  )
  db.run("DELETE FROM resolved_thread WHERE source_id = ? AND lang = ?", input.sourceId, input.lang)
  return { ...source, participants }
}

export function resolveThread(db: Db, sourceId: number, lang: string, userId: string, resolved: boolean) {
  if (resolved)
    db.run(
      `INSERT INTO resolved_thread (source_id, lang, at, by) SELECT ?1, ?2, ?3, ?4
       WHERE EXISTS (SELECT 1 FROM comment WHERE source_id = ?1 AND lang = ?2)
       ON CONFLICT (source_id, lang) DO NOTHING`,
      sourceId,
      lang,
      Date.now(),
      userId,
    )
  else db.run("DELETE FROM resolved_thread WHERE source_id = ? AND lang = ?", sourceId, lang)
}

export function openQuestions(db: Db) {
  return db.all<{
    id: number
    key: string
    area: string
    comments: number
    comment_id: number
    user_id: string
    body: string
    at: number
  }>(
    `SELECT s.id, s.key, a.slug area, count(*) comments, last.id comment_id, last.user_id, last.body, last.at
     FROM comment c JOIN source s ON s.id = c.source_id JOIN file f ON f.id = s.file_id JOIN area a ON a.id = f.area_id
     JOIN comment last ON last.id = (SELECT max(id) FROM comment WHERE source_id = s.id AND lang = '')
     WHERE c.lang = '' AND NOT EXISTS (SELECT 1 FROM resolved_thread r WHERE r.source_id = s.id AND r.lang = '')
     GROUP BY s.id ORDER BY last.at DESC`,
  )
}
