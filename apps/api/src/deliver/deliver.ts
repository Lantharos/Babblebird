import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { GitHubError } from "../github/api.ts"
import { type Repo, readPaths } from "../github/repo.ts"
import { deliveriesOn, reportFailure } from "../ops/events.ts"
import { stringsOf } from "../strings/client.ts"
import { repoOf } from "../sync/area.ts"
import { type PendingFile, pathOf, withGenerated } from "./files.ts"
import { BRANCH, closePull, commitFiles, headOf, mergeWhenReady, moveBranch, openPull } from "./git.ts"
import { commitMessage } from "./message.ts"

export interface DeliverJob {
  projectId: string
}

const CREDIT_WINDOW_MS = 7 * 86_400_000
export const QUIET_MS = 20 * 60_000
export const LONGEST_WAIT_MS = 6 * 3_600_000
const RETRY_MS = 10 * 60_000
const OVERTAKEN =
  "Everything in this pull request was changed or removed in the repository in the meantime, so Babblebird closed it. Translations that differ from the repository are kept as suggestions in Babblebird."

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

async function withdraw(projectId: string, repo: Repo, pullNumber: number) {
  if (await closePull(repo, pullNumber, OVERTAKEN))
    await recordDelivery(projectId, { pullNumber: null, branchSha: null, problem: null })
}

async function sameAsSent(
  repo: Repo,
  previous: typeof schema.delivery.$inferSelect | undefined,
  built: { path: string; content: string }[],
) {
  if (!previous?.branchSha) return false
  const paths = new Set(previous.sentPaths)
  if (paths.size !== built.length || !built.every((file) => paths.has(file.path))) return false
  const sent = await readPaths(
    repo,
    previous.branchSha,
    built.map((file) => file.path),
  )
  return built.every((file) => sent.get(file.path) === file.content)
}

function readyAt(files: PendingFile[], sentAt: number) {
  const newest = Math.max(...files.map((file) => file.changed))
  const waitingSince = Math.max(sentAt, Math.min(...files.map((file) => file.since)))
  return Math.min(newest + QUIET_MS, waitingSince + LONGEST_WAIT_MS)
}

export async function deliver({ projectId }: DeliverJob) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.id, projectId) })
  if (!project || project.delivery === "off" || project.state === "removed" || project.pausedAt) return
  const strings = stringsOf(project)
  if (!(await deliveriesOn())) return strings.deliverAfter(RETRY_MS)
  const files = await strings.pending()
  const previous = await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) })
  const open = previous?.pullNumber && !previous.mergedAt && !previous.closedAt ? previous.pullNumber : null
  if (!files.length) {
    if (open) await withdraw(project.id, await repoOf(project), open)
    return
  }
  const newest = Math.max(...files.map((file) => file.changed))
  if (previous?.closedAt && newest <= previous.closedAt.getTime()) return
  const sentAt = previous?.sentAt?.getTime() ?? 0
  const ready = readyAt(files, sentAt)
  if (newest > sentAt && ready > Date.now()) return strings.deliverAfter(ready - Date.now())
  try {
    const repo = await repoOf(project)
    const head = await headOf(repo, project.defaultBranch)
    if (!head) throw new GitHubError(404, project.defaultBranch, "")
    if (open && previous?.baseSha === head && newest <= sentAt) return
    const since = Math.min(...files.map((file) => file.changed))
    const prepared = await strings.build(
      files,
      await readPaths(repo, head, files.map(pathOf)),
      since - CREDIT_WINDOW_MS,
      project.sourceLang,
    )
    const built = withGenerated(prepared.built, project.generated)
    if (!built.length) {
      if (open) await withdraw(project.id, repo, open)
      return
    }
    if (open && newest <= sentAt && (await sameAsSent(repo, previous, built)))
      return recordDelivery(project.id, { baseSha: head })
    const message = await commitMessage(
      files.map((file) => file.lang),
      prepared.translators,
    )
    const commit = await commitFiles(repo, head, built, message)
    if (!commit) return
    const sent = {
      checks: null,
      branchSha: commit,
      sentPaths: built.map((file) => file.path),
      baseSha: head,
      sentAt: new Date(),
      mergedAt: null,
      closedAt: null,
      problem: null,
    }
    if (project.delivery === "direct" && (await moveBranch(repo, project.defaultBranch, commit, false)))
      return recordDelivery(project.id, { ...sent, pullNumber: null, mergedAt: new Date() })
    await moveBranch(repo, BRANCH, commit, true)
    const mergesItself = project.delivery !== "pull"
    const pull = await openPull(repo, project.defaultBranch, message.split("\n")[0]!, mergesItself)
    await recordDelivery(project.id, {
      ...sent,
      pullNumber: pull.number,
      problem:
        project.delivery === "direct"
          ? "The default branch is protected, so translations go through a pull request."
          : null,
    })
    if (mergesItself && (await mergeWhenReady(repo, pull, message)))
      await recordDelivery(project.id, { mergedAt: new Date() })
  } catch (error) {
    console.error(error)
    const problem = explain(error)
    await recordDelivery(project.id, { problem })
    await strings.deliverAfter(RETRY_MS)
    reportFailure({ kind: "delivery", projectId: project.id, problem, error })
  }
}
