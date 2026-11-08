import { env } from "cloudflare:workers"
import { englishName } from "@babblebird/protocol"
import { and, eq, ne } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { all, shard } from "../db/strings.ts"
import { GitHubError } from "../github/api.ts"
import { readPaths } from "../github/repo.ts"
import { repoOf } from "../sync/area.ts"
import { buildFile, pathOf, pendingFiles, translators } from "./files.ts"
import { BRANCH, commitFiles, headOf, mergeWhenReady, moveBranch, openPull } from "./git.ts"
import { commitMessage } from "./message.ts"

export interface DeliverJob {
  projectId: string
}

const CREDIT_WINDOW_MS = 7 * 86_400_000

export async function recordDelivery(
  projectId: string,
  values: Partial<typeof schema.delivery.$inferInsert>,
) {
  await db
    .insert(schema.delivery)
    .values({ projectId, ...values })
    .onConflictDoUpdate({ target: schema.delivery.projectId, set: values })
}

function explain(error: unknown) {
  if (error instanceof GitHubError && error.status === 403)
    return "GitHub didn’t let Babblebird write to the repository. Check the app’s permissions."
  if (error instanceof GitHubError && error.status === 404)
    return "The repository or its default branch is gone."
  return "Sending didn’t work. Babblebird tries again within ten minutes."
}

export async function deliver({ projectId }: DeliverJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, projectId) })
  if (!project || project.delivery === "off" || project.state === "removed") return
  const strings = shard(project)
  const files = await pendingFiles(strings, project.id)
  if (!files.length) return
  const previous = await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) })
  const newest = Math.max(...files.map((file) => file.changed))
  if (previous?.closedAt && newest <= previous.closedAt.getTime()) return
  const repo = await repoOf(project)
  try {
    const head = await headOf(repo, project.defaultBranch)
    if (!head) throw new GitHubError(404, project.defaultBranch, "")
    const waiting = previous?.pullNumber && !previous.mergedAt && !previous.closedAt
    if (waiting && previous.baseSha === head && newest <= (previous.sentAt?.getTime() ?? 0)) return
    const existing = await readPaths(repo, head, files.map(pathOf))
    const built = (
      await Promise.all(files.map((file) => buildFile(strings, file, existing.get(pathOf(file))!)))
    ).filter((file) => file !== null)
    if (!built.length) return
    const since = Math.min(...files.map((file) => file.changed))
    const message = await commitMessage(
      files.map((file) => file.lang),
      await translators(strings, project.id, files, since - CREDIT_WINDOW_MS),
    )
    const commit = await commitFiles(repo, head, built, message)
    if (!commit) return
    const sent = {
      branchSha: commit,
      baseSha: head,
      sentAt: new Date(),
      mergedAt: null,
      closedAt: null,
      problem: null,
    }
    if (project.delivery === "direct" && (await moveBranch(repo, project.defaultBranch, commit, false)))
      return recordDelivery(project.id, { ...sent, pullNumber: null, mergedAt: new Date() })
    await moveBranch(repo, BRANCH, commit, true)
    const languages = [...new Set(files.map((file) => englishName(file.lang)))]
    const pull = await openPull(
      repo,
      project.defaultBranch,
      languages.length > 3 ? `${languages.length} languages’` : languages.join(", "),
    )
    await recordDelivery(project.id, {
      ...sent,
      pullNumber: pull.number,
      problem:
        project.delivery === "direct"
          ? "The default branch is protected, so translations go through a pull request."
          : null,
    })
    if (await mergeWhenReady(repo, pull)) await recordDelivery(project.id, { mergedAt: new Date() })
  } catch (error) {
    console.error(error)
    await recordDelivery(project.id, { problem: explain(error) })
  }
}

export async function queueDeliveries() {
  const sending = await db
    .select({ id: schema.project.id, shard: schema.project.shard })
    .from(schema.project)
    .where(and(ne(schema.project.delivery, "off"), ne(schema.project.state, "removed")))
  for (const [index, group] of Map.groupBy(sending, (project) => project.shard)) {
    const rows = await all<{ project_id: string }>(
      shard({ shard: index })
        .prepare(
          "SELECT DISTINCT project_id FROM pending WHERE project_id IN (SELECT value FROM json_each(?))",
        )
        .bind(JSON.stringify(group.map((project) => project.id))),
    )
    if (rows.length)
      await env.DELIVER.sendBatch(
        rows.map((row) => ({ body: { projectId: row.project_id } satisfies DeliverJob })),
      )
  }
}
