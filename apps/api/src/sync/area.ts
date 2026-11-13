import { type GlossaryTerm, readFile } from "@babblebird/fluent"
import { eq, sql } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { installationToken } from "../github/app.ts"
import { type Repo, readBlobs } from "../github/repo.ts"
import { all, eachRow, runAll, type Strings, stringsOf } from "../strings/client.ts"
import { publishTotals, recountStatements } from "./apply/progress.ts"
import { applySources } from "./apply/sources.ts"
import { applyTranslations, clearSettled } from "./apply/translations.ts"
import { blameCredits } from "./import/credits.ts"
import type { SyncJob } from "./jobs.ts"

type AreaJob = Extract<SyncJob, { kind: "area" }>

export async function repoOf(project: ProjectRow): Promise<Repo> {
  return { owner: project.owner, name: project.name, token: await installationToken(project.installationId) }
}

export async function glossaryOf(strings: Strings, lang: string) {
  return all<GlossaryTerm>(
    strings.prepare("SELECT term, translation, note FROM glossary WHERE lang = ?").bind(lang),
  )
}

export async function syncArea(job: AreaJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, job.projectId) })
  if (!project || project.state === "removed" || project.pausedAt) return
  const strings = stringsOf(project)
  const repo = await repoOf(project)
  const texts = await readBlobs(repo, job.blobs)
  const sources = job.blobs.filter((blob) => blob.lang === project.sourceLang)
  const targets = job.blobs.filter((blob) => blob.lang !== project.sourceLang)
  let sourcesChanged = false
  for (const blob of sources)
    sourcesChanged =
      (await applySources(strings, blob.fileId, readFile(texts.get(blob.sha)!).units)) || sourcesChanged
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
    if (!glossaries.has(blob.lang)) glossaries.set(blob.lang, await glossaryOf(strings, blob.lang))
    const fileCredits = credits?.get(blob.path)
    const changed = await applyTranslations(strings, {
      fileId: blob.fileId,
      lang: blob.lang,
      units: readFile(texts.get(blob.sha)!).units,
      credit: (key) => fileCredits?.get(key) ?? job.credit,
      glossary: glossaries.get(blob.lang)!,
    })
    if (changed) touched.add(blob.lang)
  }
  await runAll(strings, [
    ...targets.map((blob) => clearSettled(strings, blob.fileId, blob.lang)),
    ...eachRow(
      strings,
      `INSERT INTO blob (file_id, lang, sha) SELECT j.value->>0, j.value->>1, j.value->>2 FROM json_each(?1) j WHERE true
       ON CONFLICT (file_id, lang) DO UPDATE SET sha = excluded.sha`,
      job.blobs.map((blob) => [blob.fileId, blob.lang, blob.sha]),
    ),
  ])
  await publishTotals(
    strings,
    project.id,
    sourcesChanged || touched.size
      ? recountStatements(strings, job.areaId, sourcesChanged ? null : [...touched])
      : [],
  )
  if (project.state !== "scanning") return
  const done = sql`${schema.project.importDone} + ${job.blobs.length}`
  await db
    .update(schema.project)
    .set({
      importDone: done,
      state: sql`CASE WHEN ${done} >= ${schema.project.importTotal} THEN 'ready' ELSE ${schema.project.state} END`,
    })
    .where(eq(schema.project.id, project.id))
}
