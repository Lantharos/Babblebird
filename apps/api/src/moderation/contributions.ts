import { env } from "cloudflare:workers"
import { type GlossaryTerm, problemFlags, runChecks } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { and, inArray, ne } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import type { DeliverJob } from "../deliver/deliver.ts"
import { contributedTo } from "../projects/work.ts"
import { all, eachRow, runAll, type Strings, stringsOf } from "../strings/client.ts"
import { publishTotals, recountStatements } from "../sync/apply/progress.ts"
import { clearSettled } from "../sync/apply/translations.ts"
import { glossaryOf } from "../sync/area.ts"

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

export interface Removed {
  translations: number
  suggestions: number
  projects: Set<string>
}

function changedBy(strings: Strings, userId: string) {
  return all<Changed>(
    strings
      .prepare(
        `SELECT t.source_id, t.lang, t.base, s.body source, s.file_id, f.area_id
         FROM (SELECT DISTINCT source_id, lang FROM activity WHERE user_id = ?1 AND source_id IS NOT NULL) a
         JOIN translation t ON t.source_id = a.source_id AND t.lang = a.lang
         JOIN source s ON s.id = t.source_id JOIN file f ON f.id = s.file_id
         WHERE t.by = ?1 AND t.unsent = 1`,
      )
      .bind(userId),
  )
}

function suggestedBy(strings: Strings, userId: string) {
  return all<Suggested>(
    strings
      .prepare(
        `SELECT g.id, g.lang, f.area_id FROM suggestion g
         JOIN source s ON s.id = g.source_id JOIN file f ON f.id = s.file_id WHERE g.by = ?1`,
      )
      .bind(userId),
  )
}

async function restoredRows(strings: Strings, changed: Changed[]) {
  const glossaries = new Map<string, GlossaryTerm[]>()
  const rows: unknown[][] = []
  for (const row of changed) {
    if (row.base === null) continue
    if (!glossaries.has(row.lang)) glossaries.set(row.lang, await glossaryOf(strings, row.lang))
    const flags = problemFlags(runChecks(row.source, row.base, row.lang, glossaries.get(row.lang)!))
    rows.push([row.source_id, row.lang, row.base, flags])
  }
  return rows
}

function settled(strings: Strings, changed: Changed[], now: number) {
  const files = new Map(changed.map((row) => [`${row.file_id}:${row.lang}`, row]))
  return [...files.values()].flatMap((row) => [
    clearSettled(strings, row.file_id, row.lang),
    strings
      .prepare("UPDATE pending SET changed = ? WHERE file_id = ? AND lang = ?")
      .bind(now, row.file_id, row.lang),
  ])
}

function recounted(strings: Strings, rows: (Changed | Suggested)[]) {
  return [...Map.groupBy(rows, (row) => row.area_id)].flatMap(([areaId, group]) =>
    recountStatements(strings, areaId, [...new Set(group.map((row) => row.lang))]),
  )
}

async function removeIn(projectId: string, userId: string) {
  const strings = stringsOf({ id: projectId })
  const [changed, suggested] = await Promise.all([changedBy(strings, userId), suggestedBy(strings, userId)])
  if (!changed.length && !suggested.length) return { translations: 0, suggestions: 0 }
  const now = Date.now()
  await runAll(strings, [
    ...eachRow(
      strings,
      `UPDATE translation SET body = j.value->>2, base = NULL, unsent = 0, state = ${STATE.translated}, flags = j.value->>3,
         by = NULL, credit_id = NULL, at = ?1
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
      `INSERT INTO activity (lang, source_id, user_id, kind, detail, at)
       SELECT j.value->>0, j.value->>1, NULL, 'reverted', j.value->>2, ?1 FROM json_each(?2) j`,
      changed.map((row) => [row.lang, row.source_id, row.base]),
      now,
    ),
  ])
  await publishTotals(strings, projectId, [
    ...settled(strings, changed, now),
    ...recounted(strings, [...changed, ...suggested]),
  ])
  return { translations: changed.length, suggestions: suggested.length }
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
  const projects = projectId ? [projectId] : (await contributedTo(userId)).map((row) => row.projectId)
  const results = await Promise.all(projects.map(async (id) => ({ id, ...(await removeIn(id, userId)) })))
  const removed: Removed = {
    translations: results.reduce((sum, result) => sum + result.translations, 0),
    suggestions: results.reduce((sum, result) => sum + result.suggestions, 0),
    projects: new Set(
      results.filter((result) => result.translations + result.suggestions).map((result) => result.id),
    ),
  }
  await redeliver(removed.projects)
  return removed
}
