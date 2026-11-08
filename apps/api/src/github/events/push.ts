import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import type { DeliverJob } from "../../deliver/deliver.ts"
import { creditOf } from "../../sync/import/credits.ts"
import { scan } from "../../sync/jobs.ts"

interface PushCommit {
  message: string
  author: { name: string; username?: string }
  added: string[]
  removed: string[]
  modified: string[]
}

interface Push {
  ref: string
  pusher?: { name: string }
  sender?: { login: string }
  after: string
  deleted: boolean
  forced?: boolean
  size?: number
  commits: PushCommit[]
  repository: { id: number }
}

const RELEVANT =
  /(^|\/)locales\/[^/]+\/[^/]+\.ftl$|(^|\/)(Sabine|extension|babblebird)\.toml$|\.tbx$|\.(svg|png|webp)$/
const COAUTHOR = /^Co-authored-by:\s*(.+?)\s*<[^>]*>\s*$/gim

function authorsOf(commit: PushCommit) {
  const coauthors = [...commit.message.matchAll(COAUTHOR)].map((match) => ({ name: match[1]!, user: null }))
  return [
    { name: commit.author.name, user: commit.author.username ? { login: commit.author.username } : null },
    ...coauthors,
  ]
}

export function pushCredit(commits: PushCommit[]) {
  return creditOf(commits.flatMap(authorsOf))
}

export async function handlePush(push: Push) {
  if (push.deleted) return
  const project = await db.query.project.findFirst({ where: eq(schema.project.repoId, push.repository.id) })
  if (!project || project.state === "removed" || push.ref !== `refs/heads/${project.defaultBranch}`) return
  const truncated = push.size !== undefined && push.size > push.commits.length
  const relevant =
    truncated ||
    push.forced ||
    !push.commits.length ||
    project.state === "failed" ||
    push.commits.some((commit) =>
      [...commit.added, ...commit.removed, ...commit.modified].some((path) => RELEVANT.test(path)),
    )
  const head = push.commits.at(-1)
  if (relevant)
    await scan(project.id, push.after, {
      reason: "push",
      credit: pushCredit(push.commits),
      message: head?.message.split("\n")[0] ?? null,
      by: push.sender?.login ?? push.pusher?.name ?? null,
    })
  await recheckOpenPull(project)
}

const RECHECK_AFTER_SECONDS = 20

async function recheckOpenPull(project: { id: string; delivery: string }) {
  if (project.delivery === "off") return
  const delivery = await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) })
  if (!delivery?.pullNumber || delivery.mergedAt || delivery.closedAt) return
  await env.DELIVER.send({ projectId: project.id } satisfies DeliverJob, {
    delaySeconds: RECHECK_AFTER_SECONDS,
  })
}
