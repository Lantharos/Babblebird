import { env } from "cloudflare:workers"
import { and, inArray, ne } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import type { DeliverJob } from "../deliver/deliver.ts"
import { contributedTo } from "../projects/work.ts"
import { stringsOf } from "../strings/client.ts"

export interface Removed {
  translations: number
  suggestions: number
  projects: Set<string>
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
  const results = await Promise.all(
    projects.map(async (id) => ({ id, ...(await stringsOf({ id }).removeWork(userId)) })),
  )
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
