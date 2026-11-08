import { env } from "cloudflare:workers"
import { englishName } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { all, shard } from "../db/strings.ts"
import { readPaths } from "../github/repo.ts"
import { repoOf } from "../sync/area.ts"
import { buildFile, pathOf, pendingFiles, translators } from "./files.ts"
import { BRANCH, commitFiles, headOf, mergeWhenReady, moveBranch, openPull } from "./git.ts"
import { commitMessage } from "./message.ts"

export interface DeliverJob {
  projectId: string
}

async function clearPending(project: ProjectRow, upTo: number) {
  await shard(project)
    .prepare("DELETE FROM pending WHERE project_id = ? AND changed <= ?")
    .bind(project.id, upTo)
    .run()
}

async function record(projectId: string, values: Partial<typeof schema.delivery.$inferInsert>) {
  await db
    .insert(schema.delivery)
    .values({ projectId, ...values })
    .onConflictDoUpdate({ target: schema.delivery.projectId, set: values })
}

export async function deliver({ projectId }: DeliverJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, projectId) })
  if (!project || project.delivery === "off" || project.state === "removed") return
  const strings = shard(project)
  const files = await pendingFiles(strings, project.id)
  if (!files.length) return
  const previous = await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) })
  const waiting = previous?.sentAt && !previous.mergedAt && previous.pullNumber
  if (waiting && files.every((file) => file.changed <= previous.sentAt!.getTime())) return
  const started = Date.now()
  const since = Math.min(...files.map((file) => file.changed))
  const repo = await repoOf(project)
  const message = await commitMessage(
    files.map((file) => file.lang),
    await translators(strings, project.id, files, since - 7 * 86_400_000),
  )
  const head = await headOf(repo, project.defaultBranch)
  if (!head) throw new Error(`The ${project.defaultBranch} branch is missing`)
  const existing = await readPaths(repo, head, files.map(pathOf))
  const built = await Promise.all(files.map((file) => buildFile(strings, file, existing.get(pathOf(file))!)))
  const commit = await commitFiles(repo, head, built, message)
  if (!commit) return clearPending(project, started)
  if (project.delivery === "direct" && (await moveBranch(repo, project.defaultBranch, commit, false))) {
    await record(project.id, {
      branchSha: commit,
      pullNumber: null,
      sentAt: new Date(started),
      mergedAt: new Date(),
      problem: null,
    })
    return clearPending(project, started)
  }
  await moveBranch(repo, BRANCH, commit, true)
  const languages = [...new Set(files.map((file) => englishName(file.lang)))]
  const pull = await openPull(
    repo,
    project.defaultBranch,
    languages.length > 3 ? `${languages.length} languages'` : languages.join(", "),
  )
  await record(project.id, {
    branchSha: commit,
    pullNumber: pull.number,
    sentAt: new Date(started),
    mergedAt: null,
    problem: null,
  })
  if (await mergeWhenReady(repo, pull)) await merged(project, started)
}

export async function merged(project: ProjectRow, sentAt: number) {
  await record(project.id, { mergedAt: new Date() })
  await clearPending(project, sentAt)
}

export async function queueDeliveries() {
  const shards = new Set(
    (await db.select({ shard: schema.project.shard }).from(schema.project)).map((row) => row.shard),
  )
  for (const index of shards) {
    const rows = await all<{ project_id: string }>(
      shard({ shard: index }).prepare("SELECT DISTINCT project_id FROM pending"),
    )
    if (rows.length)
      await env.DELIVER.sendBatch(
        rows.map((row) => ({ body: { projectId: row.project_id } satisfies DeliverJob })),
      )
  }
}
