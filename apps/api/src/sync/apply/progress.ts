import { type Progress, STATE } from "@babblebird/protocol"
import type { Db } from "../../strings/db.ts"

export function recount(db: Db, areaId: number, langs: string[] | null) {
  const only = (column: string) => (langs ? `AND ${column} IN (SELECT value FROM json_each(?2))` : "")
  const params = langs ? [areaId, JSON.stringify(langs)] : [areaId]
  db.run(`DELETE FROM progress WHERE area_id = ?1 ${only("lang")}`, ...params)
  db.run(
    `INSERT INTO progress (lang, area_id, translated, review, approved, problems, suggested)
     SELECT t.lang, ?1, count(*), sum(t.state = ${STATE.review}), sum(t.state = ${STATE.approved}), sum(t.flags != 0), 0
     FROM file f JOIN source s ON s.file_id = f.id JOIN translation t ON t.source_id = s.id
     WHERE f.area_id = ?1 ${only("t.lang")} GROUP BY t.lang`,
    ...params,
  )
  db.run(
    `INSERT INTO progress (lang, area_id, translated, review, approved, problems, suggested)
     SELECT g.lang, ?1, 0, 0, 0, 0, count(DISTINCT g.source_id)
     FROM file f JOIN source s ON s.file_id = f.id JOIN suggestion g ON g.source_id = s.id
     WHERE f.area_id = ?1 ${only("g.lang")} GROUP BY g.lang
     ON CONFLICT (lang, area_id) DO UPDATE SET suggested = excluded.suggested`,
    ...params,
  )
  db.run(
    `UPDATE area SET strings = (SELECT count(*) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1),
       words = (SELECT coalesce(sum(s.words), 0) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1)
     WHERE id = ?1`,
    areaId,
  )
}

export interface Totals {
  strings: number
  words: number
  progress: Record<string, Progress>
}

export function totals(db: Db): Totals {
  const area = db.one<{ strings: number; words: number }>(
    "SELECT coalesce(sum(strings), 0) strings, coalesce(sum(words), 0) words FROM area",
  )!
  const languages = db.all<Progress & { lang: string }>(
    `SELECT lang, sum(translated) translated, sum(review) review, sum(approved) approved, sum(problems) problems,
       sum(suggested) suggested FROM progress GROUP BY lang`,
  )
  return {
    ...area,
    progress: Object.fromEntries(languages.map(({ lang, ...progress }) => [lang, progress])),
  }
}
