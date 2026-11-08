import { eq } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { merged } from "../../deliver/deliver.ts"
import { BRANCH, mergeNow } from "../../deliver/git.ts"
import { repoOf } from "../../sync/area.ts"

async function deliveryOf(repoId: number) {
  const project = await db.query.project.findFirst({ where: eq(schema.project.repoId, repoId) })
  const delivery =
    project && (await db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) }))
  return project && delivery ? { project, delivery } : null
}

export async function handlePullRequest(payload: Record<string, any>) {
  if (payload.action !== "closed" || !payload.pull_request.merged || payload.pull_request.head.ref !== BRANCH)
    return
  const found = await deliveryOf(payload.repository.id)
  if (found?.delivery.sentAt) await merged(found.project, found.delivery.sentAt.getTime())
}

export async function handleCheckSuite(payload: Record<string, any>) {
  const suite = payload.check_suite
  if (payload.action !== "completed" || suite.conclusion !== "success" || suite.head_branch !== BRANCH) return
  const found = await deliveryOf(payload.repository.id)
  if (!found?.delivery.pullNumber || found.delivery.mergedAt || found.delivery.branchSha !== suite.head_sha)
    return
  if (await mergeNow(await repoOf(found.project), found.delivery.pullNumber))
    await merged(found.project, found.delivery.sentAt!.getTime())
}
