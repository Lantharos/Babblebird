import { and, eq, lt, or } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { github } from "../github/api.ts"
import { installationToken } from "../github/app.ts"
import { scan } from "./jobs.ts"
import { LAYOUT_VERSION } from "./layout/detect.ts"

const QUIET_MS = 9 * 60_000

async function rescan(project: ProjectRow) {
  const token = await installationToken(project.installationId)
  const branch = await github<{ commit: { sha: string } }>(
    `/repos/${project.owner}/${project.name}/branches/${encodeURIComponent(project.defaultBranch)}`,
    { token },
  )
  await scan(project.id, branch.commit.sha, { reason: "automatic" })
}

export async function rescanStale() {
  const quiet = new Date(Date.now() - QUIET_MS)
  const stale = await db
    .select()
    .from(schema.project)
    .where(
      and(
        lt(schema.project.updatedAt, quiet),
        or(
          eq(schema.project.state, "failed"),
          and(eq(schema.project.state, "ready"), lt(schema.project.layoutVersion, LAYOUT_VERSION)),
        ),
      ),
    )
  for (const project of stale) await rescan(project)
}
