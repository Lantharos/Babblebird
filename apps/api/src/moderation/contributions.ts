import { env } from "cloudflare:workers"
import { type GlossaryTerm, problemFlags, runChecks } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { and, eq, inArray, ne } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { all, eachRow, runAll, shard, shardsInUse } from "../db/strings.ts"
import type { DeliverJob } from "../deliver/deliver.ts"
import { recountArea } from "../sync/apply/progress.ts"
import { clearSettled } from "../sync/apply/translations.ts"
import { glossaryOf } from "../sync/area.ts"

interface Changed {
  source_id: number
  lang: string
  base: string | null
  source: string
  file_id: number
  area_id: number
  project_id: string
}

interface Suggested {
  id: number
  lang: string
  area_id: number
  project_id: string
}

export interface Removed {
  translations: number
  suggestions: number
  projects: Set<string>
}

const scope = (projectId: string | null) => (projectId ? [projectId] : [])

function changedBy(strings: D1Database, userId: string, projectId: string | null) {
  return all<Changed>(
    strings
      .prepare(
        `SELECT t.source_id, t.lang, t.base, s.body source, s.file_id, f.area_id, f.project_id
         FROM (SELECT DISTINCT source_id, lang FROM activity
               WHERE user_id = ?1 AND source_id IS NOT NULL ${projectId ? "AND project_id = ?2" : ""}) a
         JOIN translation t ON t.source_id = a.source_id AND t.lang = a.lang
         JOIN source s ON s.id = t.source_id JOIN file f ON f.id = s.file_id
         WHERE t.by = ?1 AND (t.base IS NULL OR t.base != t.body)`,
      )
      .bind(userId, ...scope(projectId)),
  )
}

function suggestedBy(strings: D1Database, userId: string, projectId: string | null) {
  return all<Suggested>(
    strings
      .prepare(
        `SELECT g.id, g.lang, f.area_id, f.project_id FROM suggestion g
         JOIN source s ON s.id = g.source_id JOIN file f ON f.id = s.file_id
         WHERE g.by = ?1 ${projectId ? "AND f.project_id = ?2" : ""}`,
      )
      .bind(userId, ...scope(projectId)),
  )
}

async function restoredRows(strings: D1Database, changed: Changed[]) {
  const glossaries = new Map<string, GlossaryTerm[]>()
  const rows: unknown[][] = []
  for (const row of changed) {
    if (row.base === null) continue
    const key = `${row.project_id}:${row.lang}`
    if (!glossaries.has(key)) glossaries.set(key, await glossaryOf(strings, row.project_id, row.lang))
    const flags = problemFlags(runChecks(row.source, row.base, row.lang, glossaries.get(key)!))
    rows.push([row.source_id, row.lang, row.base, flags])
  }
  return rows
}

async function settle(strings: D1Database, changed: Changed[], now: number) {
  const files = new Map(changed.map((row) => [`${row.project_id}:${row.file_id}:${row.lang}`, row]))
  for (const row of files.values()) {
    await clearSettled(strings, row.project_id, row.file_id, row.lang)
    await strings
      .prepare("UPDATE pending SET changed = ? WHERE project_id = ? AND file_id = ? AND lang = ?")
      .bind(now, row.project_id, row.file_id, row.lang)
      .run()
  }
}

async function recount(strings: D1Database, rows: (Changed | Suggested)[]) {
  const areas = Map.groupBy(rows, (row) => `${row.project_id}:${row.area_id}`)
  for (const group of areas.values()) {
    const { project_id, area_id } = group[0]!
    await recountArea(strings, project_id, area_id, [...new Set(group.map((row) => row.lang))])
  }
}

async function removeIn(strings: D1Database, userId: string, projectId: string | null): Promise<Removed> {
  const [changed, suggested] = await Promise.all([
    changedBy(strings, userId, projectId),
    suggestedBy(strings, userId, projectId),
  ])
  const now = Date.now()
  await runAll(strings, [
    ...eachRow(
      strings,
      `UPDATE translation SET body = j.value->>2, state = ${STATE.translated}, flags = j.value->>3, by = NULL, credit = NULL, at = ?1
       FROM json_each(?2) j WHERE source_id = j.value->>0 AND lang = j.value->>1`,
      await restoredRows(strings, changed),
      now,
    ),
    ...eachRow(
      strings,
      "DELETE FROM translation WHERE (source_id, lang) IN (SELECT j.value->>0, j.value->>1 FROM json_each(?1) j)",
      changed.filter((row) => row.base === null).map((row) => [row.source_id, row.lang]),
    ),
    ...eachRow(
      strings,
      "DELETE FROM suggestion WHERE id IN (SELECT j.value->>0 FROM json_each(?1) j)",
      suggested.map((row) => [row.id]),
    ),
    ...eachRow(
      strings,
      `INSERT INTO activity (project_id, lang, source_id, user_id, kind, detail, at)
       SELECT j.value->>0, j.value->>1, j.value->>2, NULL, 'reverted', j.value->>3, ?1 FROM json_each(?2) j`,
      changed.map((row) => [row.project_id, row.lang, row.source_id, row.base]),
      now,
    ),
  ])
  await settle(strings, changed, now)
  await recount(strings, [...changed, ...suggested])
  return {
    translations: changed.length,
    suggestions: suggested.length,
    projects: new Set([...changed, ...suggested].map((row) => row.project_id)),
  }
}

async function redeliver(projectIds: Set<string>) {
  if (!projectIds.size) return
  const sending = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(and(inArray(schema.project.id, [...projectIds]), ne(schema.project.delivery, "off")))
  if (sending.length)
    await env.DELIVER.sendBatch(
      sending.map((project) => ({ body: { projectId: project.id } satisfies DeliverJob })),
    )
}

export async function removeContributions(userId: string, projectId: string | null) {
  const project = projectId
    ? await db.query.project.findFirst({ where: eq(schema.project.id, projectId) })
    : null
  const shards = project ? [project.shard] : await shardsInUse()
  const results = await Promise.all(
    shards.map((index) => removeIn(shard({ shard: index }), userId, projectId)),
  )
  const removed: Removed = {
    translations: results.reduce((sum, result) => sum + result.translations, 0),
    suggestions: results.reduce((sum, result) => sum + result.suggestions, 0),
    projects: new Set(results.flatMap((result) => [...result.projects])),
  }
  await redeliver(removed.projects)
  return removed
}
