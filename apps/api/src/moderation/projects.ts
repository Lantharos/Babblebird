import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import type { DeliverJob } from "../deliver/deliver.ts"
import { GitHubError } from "../github/api.ts"
import { scanHead } from "../sync/head.ts"

export async function resync(project: ProjectRow, by: string) {
  try {
    await scanHead(project, { reason: "manual", by })
  } catch (error) {
    if (error instanceof GitHubError)
      throw new Error("GitHub doesn't let Babblebird read this repository right now, so it wasn't read again")
    throw error
  }
}

export async function pause(project: ProjectRow, reason: string) {
  await db
    .update(schema.project)
    .set({ pausedAt: new Date(), pausedReason: reason })
    .where(eq(schema.project.id, project.id))
}

export async function resume(project: ProjectRow, by: string) {
  await db
    .update(schema.project)
    .set({ pausedAt: null, pausedReason: null })
    .where(eq(schema.project.id, project.id))
  if (project.state === "removed") return true
  return resync({ ...project, pausedAt: null }, by).then(
    () => true,
    () => false,
  )
}

async function setState(project: ProjectRow, state: ProjectRow["state"]) {
  await db.update(schema.project).set({ state }).where(eq(schema.project.id, project.id))
}

export async function restore(project: ProjectRow, by: string) {
  await setState(project, "scanning")
  await resync(project, by).catch(async (error) => {
    await setState(project, "removed")
    throw error
  })
}

export async function remove(project: ProjectRow) {
  await setState(project, "removed")
}

export async function sendNow(project: ProjectRow) {
  await env.DELIVER.send({ projectId: project.id } satisfies DeliverJob)
}
