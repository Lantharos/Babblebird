import { eq, inArray, sql } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { randomId } from "../../lib/ids.ts"
import { scan } from "../../sync/jobs.ts"
import { github, maybe } from "../api.ts"
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
    const branch = await maybe(
      github<{ commit: { sha: string } }>(
        `/repos/${full_name}/branches/${encodeURIComponent(repo.default_branch)}`,
        { token },
      ),
    )
    const values = {
      installationId,
      owner: repo.owner.login,
      name: repo.name,
      slug: slugOf(repo.owner.login, repo.name),
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
      state: branch ? ("scanning" as const) : ("empty" as const),
    }
    const [saved] = await db
      .insert(schema.project)
      .values({ id: randomId(), repoId: repo.id, ...values })
      .onConflictDoUpdate({ target: schema.project.repoId, set: values })
      .returning({ id: schema.project.id })
    if (branch) await scan(saved!.id, branch.commit.sha, { reason: "install" })
  }
}

export async function missingRepositories(installationId: number) {
  const token = await installationToken(installationId)
  const listed: { id: number; full_name: string }[] = []
  for (let page = 1; ; page++) {
    const found = await github<{ repositories: { id: number; full_name: string }[] }>(
      `/installation/repositories?per_page=100&page=${page}`,
      { token },
    )
    listed.push(...found.repositories)
    if (found.repositories.length < 100) break
  }
  const known = new Set(
    (
      await db
        .select({ repoId: schema.project.repoId })
        .from(schema.project)
        .where(
          sql`${schema.project.repoId} IN (SELECT value FROM json_each(${JSON.stringify(listed.map((repo) => repo.id))}))`,
        )
    ).map((row) => row.repoId),
  )
  const missing = listed.filter((repo) => !known.has(repo.id))
  await addRepositories(installationId, missing)
  return missing.map((repo) => repo.full_name)
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
