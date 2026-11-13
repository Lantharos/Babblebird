import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { readBlobs, readTree, type TreeEntry } from "../github/repo.ts"
import { reportFailure } from "../ops/events.ts"
import { stringsOf } from "../strings/client.ts"
import { repoOf } from "./area.ts"
import { changedGlossaries, glossaryPattern } from "./import/glossary.ts"
import { storeIcon, storeIcons } from "./import/icons.ts"
import { type AreaBlob, areaJobs, type SyncJob, sendJobs } from "./jobs.ts"
import { CONFIG_PATH, readConfig } from "./layout/config.ts"
import {
  type DetectedArea,
  detectAreas,
  LAYOUT_VERSION,
  localeFiles,
  manifestOwner,
  projectIcon,
} from "./layout/detect.ts"
import { type Manifest, readManifest } from "./layout/manifests.ts"

type ScanJob = Extract<SyncJob, { kind: "scan" }>

async function readLayout(tree: TreeEntry[], repo: Awaited<ReturnType<typeof repoOf>>) {
  const byPath = new Map(tree.map((entry) => [entry.path, entry]))
  const configEntry = byPath.get(CONFIG_PATH)
  const configText = configEntry && (await readBlobs(repo, [configEntry])).get(configEntry.sha)
  const config = readConfig(configText)
  const paths = new Set(byPath.keys())
  const owners = new Set(
    localeFiles(tree, config)
      .map((file) => manifestOwner(file.pattern, paths))
      .filter((owner) => owner !== null),
  )
  const entries = [...owners].map((path) => byPath.get(path)!)
  const texts = await readBlobs(repo, entries)
  const manifests = new Map<string, Manifest>(
    entries.map((entry) => [
      entry.path,
      readManifest(entry.path, texts.get(entry.sha)!, (path) => paths.has(path)),
    ]),
  )
  return { config, areas: detectAreas(tree, config, manifests) }
}

function changedBlobs(
  area: DetectedArea,
  files: Map<string, number>,
  known: Map<string, string>,
): AreaBlob[] {
  return area.files.flatMap((file) => {
    const fileId = files.get(file.pattern)!
    return [...file.langs].flatMap(([lang, entry]) =>
      known.get(`${fileId}:${lang}`) === entry.sha
        ? []
        : [{ fileId, lang, sha: entry.sha, path: entry.path, size: entry.size }],
    )
  })
}

export async function scanProject(job: ScanJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, job.projectId) })
  if (!project || project.state === "removed" || project.pausedAt) return null
  const strings = stringsOf(project)
  const repo = await repoOf(project)
  try {
    const tree = await readTree(repo, job.sha)
    const { config, areas } = await readLayout(tree, repo)
    const glossaryAt = glossaryPattern(tree, config)
    const saved = await strings.applyLayout({ areas, sourceLang: config.source, glossaryPattern: glossaryAt })
    const icons = await storeIcons(repo, saved.icons)
    const iconEntry = projectIcon(tree, config)
    const icon = iconEntry ? await storeIcon(repo, iconEntry) : null
    const glossaries =
      glossaryAt && saved.glossary
        ? await changedGlossaries(repo, tree, glossaryAt, saved.glossary, config.source)
        : []
    const vanished = [...saved.known.keys()]
      .filter((key) => !saved.present.has(key))
      .map((key) => {
        const [fileId, lang] = key.split(":") as [string, string]
        return [Number(fileId), lang] as [number, string]
      })
    const fresh = saved.known.size === 0
    const jobs = areas.flatMap((area) => {
      const blobs = changedBlobs(area, saved.files, saved.known)
      const areaId = saved.areas.get(area.slug)!
      return blobs.length
        ? areaJobs(
            { kind: "area", projectId: project.id, areaId, sha: job.sha, credit: job.credit, fresh },
            blobs,
          )
        : []
    })
    const blobCount = jobs.reduce((sum, job) => sum + (job.kind === "area" ? job.blobs.length : 0), 0)
    const importing = fresh && blobCount > 0
    if (importing)
      await db
        .update(schema.project)
        .set({ state: "scanning", importTotal: blobCount, importDone: 0, importStartedAt: new Date() })
        .where(eq(schema.project.id, project.id))
    const allBlobs = jobs.flatMap((queued) => (queued.kind === "area" ? queued.blobs : []))
    const sourceFiles = allBlobs.filter((blob) => blob.lang === config.source).length
    const translationLangs = [
      ...new Set(allBlobs.filter((blob) => blob.lang !== config.source).map((blob) => blob.lang)),
    ]
    const usage = await strings.finishScan({
      icons,
      glossary: saved.glossary && { fileId: saved.glossary.fileId, entries: glossaries },
      vanished,
      synced: JSON.stringify({
        sha: job.sha,
        reason: job.reason,
        message: job.message,
        by: job.by,
        sourceFiles,
        translationFiles: allBlobs.length - sourceFiles,
        languages: translationLangs,
        areas: areas.length,
      }),
      recount: [...saved.recount],
    })
    await sendJobs(jobs)
    const languages = [
      ...new Set(areas.flatMap((area) => area.files.flatMap((file) => [...file.langs.keys()]))),
    ]
      .filter((lang) => lang !== config.source)
      .sort()
    await db
      .update(schema.project)
      .set({
        ...(!importing && { state: areas.length ? ("ready" as const) : ("empty" as const) }),
        problem: config.problem,
        headSha: job.sha,
        syncedAt: new Date(),
        sourceLang: config.source,
        languages,
        generated: config.generated,
        icon,
        layoutVersion: LAYOUT_VERSION,
      })
      .where(eq(schema.project.id, project.id))
    return usage
  } catch (error) {
    const problem = (error as Error).message
    await db.update(schema.project).set({ state: "failed", problem }).where(eq(schema.project.id, project.id))
    reportFailure({ kind: "sync", projectId: project.id, problem, error })
    throw error
  }
}
