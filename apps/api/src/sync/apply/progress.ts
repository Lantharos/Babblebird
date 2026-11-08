import { STATE } from "@babblebird/protocol"
import { counted, runAll } from "../../db/strings.ts"

export async function recountArea(db: D1Database, projectId: string, areaId: number, langs: string[] | null) {
  const only = langs ? `AND lang IN (SELECT value FROM json_each(?3))` : ""
  const bind = (statement: D1PreparedStatement) =>
    langs ? statement.bind(projectId, areaId, JSON.stringify(langs)) : statement.bind(projectId, areaId)
  await runAll(db, [
    bind(db.prepare(`DELETE FROM progress WHERE project_id = ?1 AND area_id = ?2 ${only}`)),
    bind(
      db.prepare(
        `INSERT INTO progress (project_id, lang, area_id, translated, review, approved, problems, suggested)
         SELECT ?1, t.lang, ?2, count(*), sum(t.state = ${STATE.review}), sum(t.state = ${STATE.approved}), sum(t.flags != 0), 0
         FROM file f JOIN source s ON s.file_id = f.id JOIN translation t ON t.source_id = s.id
         WHERE f.area_id = ?2 ${only.replace("lang", "t.lang")} GROUP BY t.lang`,
      ),
    ),
    bind(
      db.prepare(
        `INSERT INTO progress (project_id, lang, area_id, translated, review, approved, problems, suggested)
         SELECT ?1, g.lang, ?2, 0, 0, 0, 0, count(DISTINCT g.source_id)
         FROM file f JOIN source s ON s.file_id = f.id JOIN suggestion g ON g.source_id = s.id
         WHERE f.area_id = ?2 ${only.replace("lang", "g.lang")} GROUP BY g.lang
         ON CONFLICT (project_id, lang, area_id) DO UPDATE SET suggested = excluded.suggested`,
      ),
    ),
    db
      .prepare(
        `UPDATE area SET strings = (SELECT count(*) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1),
           words = (SELECT coalesce(sum(s.words), 0) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1)
         WHERE id = ?1`,
      )
      .bind(areaId),
  ])
}

export async function projectTotals(db: D1Database, projectId: string) {
  return counted(
    await db
      .prepare(
        "SELECT coalesce(sum(strings), 0) strings, coalesce(sum(words), 0) words FROM area WHERE project_id = ?",
      )
      .bind(projectId)
      .all<{ strings: number; words: number }>(),
  ).results[0]!
}
