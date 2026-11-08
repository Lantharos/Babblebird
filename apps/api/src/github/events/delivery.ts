import { eq } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { recordDelivery } from "../../deliver/deliver.ts"
import { BRANCH, mergeNow, messageOf } from "../../deliver/git.ts"
import { repoOf } from "../../sync/area.ts"
import { github } from "../api.ts"
import type { Repo } from "../repo.ts"

async function deliveryOf(repoId: number) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.repoId, repoId) })
  const delivery =
    project && (await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) }))
  return project && delivery ? { project, delivery } : null
}

export async function handlePullRequest(payload: Record<string, any>) {
  const pull = payload.pull_request
  if (payload.action !== "closed" || pull.head.ref !== BRANCH) return
  const found = await deliveryOf(payload.repository.id)
  if (!found || found.delivery.pullNumber !== pull.number) return
  if (pull.merged) await recordDelivery(found.project.id, { mergedAt: new Date(), problem: null })
  else
    await recordDelivery(found.project.id, {
      closedAt: new Date(),
      problem:
        "The translations pull request was closed without merging. Babblebird opens a new one when there are new translations.",
    })
}

async function mergesItself(repo: Repo) {
  const details = await github<{ allow_auto_merge?: boolean }>(`/repos/${repo.owner}/${repo.name}`, {
    token: repo.token,
  })
  return details.allow_auto_merge === true
}

export async function handleCheckSuite(payload: Record<string, any>) {
  const suite = payload.check_suite
  if (payload.action !== "completed" || suite.head_branch !== BRANCH) return
  const found = await deliveryOf(payload.repository.id)
  if (!found?.delivery.pullNumber || found.delivery.mergedAt || found.delivery.branchSha !== suite.head_sha)
    return
  if (suite.conclusion === "success") {
    const repo = await repoOf(found.project)
    if (await mergesItself(repo)) return
    const message = await messageOf(repo, suite.head_sha)
    if (await mergeNow(repo, found.delivery.pullNumber, message))
      await recordDelivery(found.project.id, { mergedAt: new Date(), problem: null })
  } else if (suite.conclusion === "failure")
    await recordDelivery(found.project.id, {
      problem:
        "The repository’s checks failed on the translations pull request. Babblebird sends a fresh one with the next translations.",
    })
}
