import type { ProjectRow } from "../db/core.ts"
import { github } from "../github/api.ts"
import { installationToken } from "../github/app.ts"
import { type ScanOptions, scan } from "./jobs.ts"

export async function scanHead(project: ProjectRow, options: ScanOptions) {
  const token = await installationToken(project.installationId)
  const branch = await github<{ commit: { sha: string } }>(
    `/repos/${project.owner}/${project.name}/branches/${encodeURIComponent(project.defaultBranch)}`,
    { token },
  )
  await scan(project.id, branch.commit.sha, options)
}
