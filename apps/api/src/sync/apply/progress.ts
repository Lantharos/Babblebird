import { type Progress, STATE } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { db as core, schema } from "../../db/core.ts"
import type { Statement, Strings } from "../../strings/client.ts"

export function recountStatements(strings: Strings, areaId: number, langs: string[] | null) {
  const only = (column: string) => (langs ? `AND ${column} IN (SELECT value FROM json_each(?2))` : "")
  const bind = (sql: string) =>
    langs ? strings.prepare(sql).bind(areaId, JSON.stringify(langs)) : strings.prepare(sql).bind(areaId)
  return [
    bind(`DELETE FROM progress WHERE area_id = ?1 ${only("lang")}`),
    bind(
      `INSERT INTO progress (lang, area_id, translated, review, approved, problems, suggested)
       SELECT t.lang, ?1, count(*), sum(t.state = ${STATE.review}), sum(t.state = ${STATE.approved}), sum(t.flags != 0), 0
       FROM file f JOIN source s ON s.file_id = f.id JOIN translation t ON t.source_id = s.id
       WHERE f.area_id = ?1 ${only("t.lang")} GROUP BY t.lang`,
    ),
    bind(
      `INSERT INTO progress (lang, area_id, translated, review, approved, problems, suggested)
       SELECT g.lang, ?1, 0, 0, 0, 0, count(DISTINCT g.source_id)
       FROM file f JOIN source s ON s.file_id = f.id JOIN suggestion g ON g.source_id = s.id
       WHERE f.area_id = ?1 ${only("g.lang")} GROUP BY g.lang
       ON CONFLICT (lang, area_id) DO UPDATE SET suggested = excluded.suggested`,
    ),
    strings
      .prepare(
        `UPDATE area SET strings = (SELECT count(*) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1),
           words = (SELECT coalesce(sum(s.words), 0) FROM file f JOIN source s ON s.file_id = f.id WHERE f.area_id = ?1)
         WHERE id = ?1`,
      )
      .bind(areaId),
  ]
}

export async function recountArea(strings: Strings, areaId: number, langs: string[] | null) {
  await strings.batch(recountStatements(strings, areaId, langs))
}

const TOTALS = [
  "SELECT coalesce(sum(strings), 0) strings, coalesce(sum(words), 0) words, EXISTS (SELECT 1 FROM pending) pending FROM area",
  `SELECT lang, sum(translated) translated, sum(review) review, sum(approved) approved, sum(problems) problems,
     sum(suggested) suggested FROM progress GROUP BY lang`,
]

export async function publishTotals(strings: Strings, projectId: string, before: Statement[] = []) {
  const results = await strings.batch([...before, ...TOTALS.map((sql) => strings.prepare(sql))])
  const [area, languages] = results.slice(-2) as [(typeof results)[number], (typeof results)[number]]
  const totals = area.results[0] as { strings: number; words: number; pending: number }
  await core
    .update(schema.project)
    .set({
      strings: totals.strings,
      words: totals.words,
      pending: totals.pending === 1,
      progress: Object.fromEntries(
        (languages.results as unknown as (Progress & { lang: string })[]).map(({ lang, ...progress }) => [
          lang,
          progress,
        ]),
      ),
    })
    .where(eq(schema.project.id, projectId))
}
