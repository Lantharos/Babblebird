import { type Filter, STATE } from "@babblebird/protocol"
import type { Db } from "../strings/db.ts"

export interface StringRecord {
  id: number
  file_id: number
  key: string
  pattern: string
  file_position: number
  position: number
  body: string
  plain: string
  comment: string | null
  section: string | null
  words: number
  hash: number
  text_hash: number
  previous: string | null
  area_id: number
  area_slug: string
  t_body: string | null
  t_state: number | null
  t_flags: number | null
  t_by: string | null
  t_credit: string | null
  t_at: number | null
  t_source_hash: number | null
  suggestions: number
  threads: number
}

const FILTERS: Record<Filter, string> = {
  all: "",
  untranslated: "AND t.source_id IS NULL",
  review: `AND t.state = ${STATE.review}`,
  problems: "AND t.flags != 0",
  suggested: "AND EXISTS (SELECT 1 FROM suggestion g WHERE g.source_id = s.id AND g.lang = ?2)",
  done: `AND t.state IN (${STATE.translated}, ${STATE.approved})`,
}

const COLUMNS = `s.id, s.file_id, s.key, f.pattern, f.position file_position, s.position, s.body, s.plain, s.comment, s.section, s.words,
  s.hash, s.text_hash, s.previous, f.area_id, (SELECT slug FROM area WHERE id = f.area_id) area_slug,
  t.body t_body, t.state t_state, t.flags t_flags, t.by t_by, (SELECT names FROM credit WHERE id = t.credit_id) t_credit,
  t.at t_at, t.source_hash t_source_hash,
  (SELECT count(*) FROM suggestion g WHERE g.source_id = s.id AND g.lang = ?2) suggestions,
  (SELECT count(DISTINCT c.lang) FROM comment c WHERE c.source_id = s.id AND c.lang IN (?2, '')
    AND NOT EXISTS (SELECT 1 FROM resolved_thread r WHERE r.source_id = c.source_id AND r.lang = c.lang)) threads`

export interface PageQuery {
  area: string
  lang: string
  filter: Filter
  after: [number, number] | null
  limit: number
}

export function stringPage(db: Db, query: PageQuery) {
  return db.all<StringRecord>(
    `SELECT ${COLUMNS} FROM file f JOIN source s ON s.file_id = f.id
     LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2
     WHERE f.area_id = (SELECT id FROM area WHERE slug = ?1) AND (f.position, s.position) > (?3, ?4) ${FILTERS[query.filter]}
     ORDER BY f.position, s.position LIMIT ?5`,
    query.area,
    query.lang,
    query.after?.[0] ?? -1,
    query.after?.[1] ?? -1,
    query.limit,
  )
}

const MIN_TRIGRAM = 3

export function searchStrings(db: Db, lang: string, text: string, limit: number) {
  const pattern = `%${text.replace(/[\\%_]/g, "\\$&")}%`
  const sources =
    [...text].length >= MIN_TRIGRAM
      ? "SELECT rowid FROM source_search WHERE source_search MATCH ?3"
      : "SELECT id FROM source WHERE key LIKE ?4 ESCAPE '\\' OR plain LIKE ?4 ESCAPE '\\'"
  return db.all<StringRecord>(
    `WITH hits (id) AS (${sources} UNION SELECT source_id FROM translation WHERE lang = ?2 AND body LIKE ?4 ESCAPE '\\')
     SELECT ${COLUMNS} FROM hits JOIN source s ON s.id = hits.id JOIN file f ON f.id = s.file_id
     LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2
     WHERE f.area_id > 0 ORDER BY f.position, s.position LIMIT ?1`,
    limit,
    lang,
    `"${text.replaceAll('"', '""')}"`,
    pattern,
  )
}

export function stringById(db: Db, id: number, lang: string) {
  return db.one<StringRecord>(
    `SELECT ${COLUMNS} FROM source s JOIN file f ON f.id = s.file_id
     LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2 WHERE s.id = ?1`,
    id,
    lang,
  )
}
