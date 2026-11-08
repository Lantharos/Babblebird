import { eq, inArray } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { randomId } from "../../lib/ids.ts"
import { scan } from "../../sync/jobs.ts"
import { github } from "../api.ts"
import { installationToken } from "../app.ts"

interface RepoDetails {
  id: number
  name: string
  private: boolean
  description: string | null
  default_branch: string
  owner: { login: string }
}

export const slugOf = (owner: string, name: string) => `${owner}/${name}`.toLowerCase()

export async function addRepositories(installationId: number, repos: { full_name: string }[]) {
  const token = await installationToken(installationId)
  for (const { full_name } of repos) {
    const repo = await github<RepoDetails>(`/repos/${full_name}`, { token })
    const branch = await github<{ commit: { sha: string } }>(
      `/repos/${full_name}/branches/${encodeURIComponent(repo.default_branch)}`,
      {
        token,
      },
    )
    const values = {
      installationId,
      owner: repo.owner.login,
      name: repo.name,
      slug: slugOf(repo.owner.login, repo.name),
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
      state: "scanning" as const,
    }
    const [saved] = await db
      .insert(schema.project)
      .values({ id: randomId(), repoId: repo.id, ...values })
      .onConflictDoUpdate({ target: schema.project.repoId, set: values })
      .returning({ id: schema.project.id })
    await scan(saved!.id, branch.commit.sha, { reason: "install" })
  }
}

export async function removeRepositories(repoIds: number[]) {
  if (repoIds.length)
    await db.update(schema.project).set({ state: "removed" }).where(inArray(schema.project.repoId, repoIds))
}

export async function removeInstallation(installationId: number) {
  await db
    .update(schema.project)
    .set({ state: "removed" })
    .where(eq(schema.project.installationId, installationId))
  await db.delete(schema.installation).where(eq(schema.installation.id, installationId))
}

export async function updateRepository(repo: RepoDetails) {
  await db
    .update(schema.project)
    .set({
      owner: repo.owner.login,
      name: repo.name,
      slug: slugOf(repo.owner.login, repo.name),
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
    })
    .where(eq(schema.project.repoId, repo.id))
}
