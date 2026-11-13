import { readFile } from "@babblebird/fluent"
import { eq, sql } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { installationToken } from "../github/app.ts"
import { type Repo, readBlobs } from "../github/repo.ts"
import { stringsOf } from "../strings/client.ts"
import { blameCredits } from "./import/credits.ts"
import type { SyncJob } from "./jobs.ts"

type AreaJob = Extract<SyncJob, { kind: "area" }>

export async function repoOf(project: ProjectRow): Promise<Repo> {
  return { owner: project.owner, name: project.name, token: await installationToken(project.installationId) }
}

export async function syncArea(job: AreaJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, job.projectId) })
  if (!project || project.state === "removed" || project.pausedAt) return null
  const repo = await repoOf(project)
  const texts = await readBlobs(repo, job.blobs)
  const unitsOf = (sha: string) => readFile(texts.get(sha)!).units
  const targets = job.blobs.filter((blob) => blob.lang !== project.sourceLang)
  const credits = job.fresh
    ? await blameCredits(
        repo,
        job.sha,
        targets.map((blob) => ({ path: blob.path, text: texts.get(blob.sha)! })),
      )
    : null
  const usage = await stringsOf(project).applyArea({
    areaId: job.areaId,
    sources: job.blobs
      .filter((blob) => blob.lang === project.sourceLang)
      .map((blob) => ({ fileId: blob.fileId, units: unitsOf(blob.sha) })),
    targets: targets.map((blob) => ({
      fileId: blob.fileId,
      lang: blob.lang,
      units: unitsOf(blob.sha),
      credits: credits?.get(blob.path) ?? new Map(),
    })),
    credit: job.credit,
    blobs: job.blobs.map((blob) => [blob.fileId, blob.lang, blob.sha]),
  })
  if (project.state === "scanning") {
    const done = sql`${schema.project.importDone} + ${job.blobs.length}`
    await db
      .update(schema.project)
      .set({
        importDone: done,
        state: sql`CASE WHEN ${done} >= ${schema.project.importTotal} THEN 'ready' ELSE ${schema.project.state} END`,
      })
      .where(eq(schema.project.id, project.id))
  }
  return usage
}
