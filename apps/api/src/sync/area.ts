import { type GlossaryTerm, readFile } from "@babblebird/fluent"
import { eq, sql } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { all, eachRow, runAll, shard } from "../db/strings.ts"
import { installationToken } from "../github/app.ts"
import { type Repo, readBlobs } from "../github/repo.ts"
import { projectTotals, recountArea } from "./apply/progress.ts"
import { applySources } from "./apply/sources.ts"
import { applyTranslations, clearSettled } from "./apply/translations.ts"
import { blameCredits } from "./import/credits.ts"
import type { SyncJob } from "./jobs.ts"

type AreaJob = Extract<SyncJob, { kind: "area" }>

export async function repoOf(project: ProjectRow): Promise<Repo> {
  return { owner: project.owner, name: project.name, token: await installationToken(project.installationId) }
}

async function glossaryOf(strings: D1Database, projectId: string, lang: string) {
  return all<GlossaryTerm>(
    strings
      .prepare("SELECT term, translation, note FROM glossary WHERE project_id = ? AND lang = ?")
      .bind(projectId, lang),
  )
}

export async function syncArea(job: AreaJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, job.projectId) })
  if (!project || project.state === "removed") return
  const strings = shard(project)
  const repo = await repoOf(project)
  const texts = await readBlobs(repo, job.blobs)
  const sources = job.blobs.filter((blob) => blob.lang === project.sourceLang)
  const targets = job.blobs.filter((blob) => blob.lang !== project.sourceLang)
  let sourcesChanged = false
  for (const blob of sources)
    sourcesChanged =
      (await applySources(
        strings,
        project.id,
        !project.private,
        blob.fileId,
        readFile(texts.get(blob.sha)!).units,
      )) || sourcesChanged
  const credits = job.fresh
    ? await blameCredits(
        repo,
        job.sha,
        targets.map((blob) => ({ path: blob.path, text: texts.get(blob.sha)! })),
      )
    : null
  const glossaries = new Map<string, GlossaryTerm[]>()
  const touched = new Set<string>()
  for (const blob of targets) {
    if (!glossaries.has(blob.lang))
      glossaries.set(blob.lang, await glossaryOf(strings, project.id, blob.lang))
    const fileCredits = credits?.get(blob.path)
    const changed = await applyTranslations(strings, {
      projectId: project.id,
      fileId: blob.fileId,
      lang: blob.lang,
      units: readFile(texts.get(blob.sha)!).units,
      credit: (key) => fileCredits?.get(key) ?? job.credit,
      glossary: glossaries.get(blob.lang)!,
    })
    if (changed) touched.add(blob.lang)
    await clearSettled(strings, project.id, blob.fileId, blob.lang)
  }
  await runAll(
    strings,
    eachRow(
      strings,
      `INSERT INTO blob (file_id, lang, sha) SELECT j.value->>0, j.value->>1, j.value->>2 FROM json_each(?1) j WHERE true
       ON CONFLICT (file_id, lang) DO UPDATE SET sha = excluded.sha`,
      job.blobs.map((blob) => [blob.fileId, blob.lang, blob.sha]),
    ),
  )
  if (sourcesChanged || touched.size)
    await recountArea(strings, project.id, job.areaId, sourcesChanged ? null : [...touched])
  const totals = await projectTotals(strings, project.id)
  const done = sql`${schema.project.importDone} + ${job.blobs.length}`
  await db
    .update(schema.project)
    .set({
      ...totals,
      ...(project.state === "scanning" && {
        importDone: done,
        state: sql`CASE WHEN ${done} >= ${schema.project.importTotal} THEN 'ready' ELSE ${schema.project.state} END`,
      }),
    })
    .where(eq(schema.project.id, project.id))
}
