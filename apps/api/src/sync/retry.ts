import { and, eq, lt } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { github } from "../github/api.ts"
import { installationToken } from "../github/app.ts"
import { scan } from "./jobs.ts"

const QUIET_MS = 9 * 60_000

export async function retryFailed() {
  const failed = await db
    .select()
    .from(schema.project)
    .where(
      and(eq(schema.project.state, "failed"), lt(schema.project.updatedAt, new Date(Date.now() - QUIET_MS))),
    )
  for (const project of failed) {
    const token = await installationToken(project.installationId)
    const branch = await github<{ commit: { sha: string } }>(
      `/repos/${project.owner}/${project.name}/branches/${encodeURIComponent(project.defaultBranch)}`,
      { token },
    )
    await scan(project.id, branch.commit.sha)
  }
}
