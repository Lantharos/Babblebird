import { type Filter, STATE } from "@babblebird/protocol"
import { all, first } from "../db/strings.ts"

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
  project_id: string
  previous: string | null
  area_id: number
  t_body: string | null
  t_state: number | null
  t_flags: number | null
  t_by: string | null
  t_credit: string | null
  t_at: number | null
  t_source_hash: number | null
  suggestions: number
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
  s.hash, s.text_hash, s.project_id, s.previous, f.area_id,
  t.body t_body, t.state t_state, t.flags t_flags, t.by t_by, t.credit t_credit, t.at t_at, t.source_hash t_source_hash,
  (SELECT count(*) FROM suggestion g WHERE g.source_id = s.id AND g.lang = ?2) suggestions`

export interface PageQuery {
  areaId: number
  lang: string
  filter: Filter
  after: [number, number] | null
  search: string | null
  limit: number
}

export function stringPage(db: D1Database, query: PageQuery) {
  const search = query.search
    ? "AND (s.key LIKE ?6 ESCAPE '\\' OR s.plain LIKE ?6 ESCAPE '\\' OR t.body LIKE ?6 ESCAPE '\\')"
    : ""
  const pattern = query.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
  return all<StringRecord>(
    db
      .prepare(
        `SELECT ${COLUMNS} FROM file f JOIN source s ON s.file_id = f.id
         LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2
         WHERE f.area_id = ?1 AND (f.position, s.position) > (?3, ?4) ${FILTERS[query.filter]} ${search}
         ORDER BY f.position, s.position LIMIT ?5`,
      )
      .bind(
        query.areaId,
        query.lang,
        query.after?.[0] ?? -1,
        query.after?.[1] ?? -1,
        query.limit,
        ...(pattern ? [pattern] : []),
      ),
  )
}

export function stringById(db: D1Database, projectId: string, id: number, lang: string) {
  return first<StringRecord>(
    db
      .prepare(
        `SELECT ${COLUMNS} FROM source s JOIN file f ON f.id = s.file_id
         LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2 WHERE s.id = ?1 AND s.project_id = ?3`,
      )
      .bind(id, lang, projectId),
  )
}
