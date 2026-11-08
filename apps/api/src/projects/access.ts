import type { Abilities, Role } from "@babblebird/protocol"
import { and, eq, ne } from "drizzle-orm"
import type { Viewer } from "../auth/session.ts"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { github, maybe } from "../github/api.ts"
import { installationToken } from "../github/app.ts"
import { fail } from "../lib/http.ts"

export type MemberRow = typeof schema.member.$inferSelect

const RECHECK_MS = 6 * 60 * 60_000
const WRITE = new Set(["admin", "maintain", "write"])

export async function findProject(owner: string, name: string) {
  const project = await db.query.project.findFirst({
    where: and(
      eq(schema.project.slug, `${owner}/${name}`.toLowerCase()),
      ne(schema.project.state, "removed"),
    ),
  })
  if (!project) fail(404, "There's no such project")
  return project
}

async function githubRole(project: ProjectRow, login: string): Promise<Role | null> {
  const token = await installationToken(project.installationId)
  const found = await maybe(
    github<{ permission: string }>(
      `/repos/${project.owner}/${project.name}/collaborators/${encodeURIComponent(login)}/permission`,
      {
        token,
      },
    ),
  )
  if (!found) return null
  if (WRITE.has(found.permission)) return "admin"
  return project.private && found.permission === "read" ? "translator" : null
}

export async function membershipOf(project: ProjectRow, viewer: Viewer | null) {
  if (!viewer) return null
  const member = await db.query.member.findFirst({
    where: and(eq(schema.member.projectId, project.id), eq(schema.member.userId, viewer.id)),
  })
  if (member && !member.fromGithub) return member
  if (member && Date.now() - (member.checkedAt?.getTime() ?? 0) < RECHECK_MS) return member
  const user = await db.query.user.findFirst({ where: eq(schema.user.id, viewer.id) })
  if (!user?.githubLogin) return member ?? null
  const role = await githubRole(project, user.githubLogin)
  if (!role) {
    if (member)
      await db
        .delete(schema.member)
        .where(and(eq(schema.member.projectId, project.id), eq(schema.member.userId, viewer.id)))
    return null
  }
  const values = { role, fromGithub: true, checkedAt: new Date(), languages: null, areas: null }
  const [saved] = await db
    .insert(schema.member)
    .values({ projectId: project.id, userId: viewer.id, ...values })
    .onConflictDoUpdate({ target: [schema.member.projectId, schema.member.userId], set: values })
    .returning()
  return saved!
}

const covers = (list: string[] | null | undefined, value: string | undefined) =>
  !list || value === undefined || list.includes(value)

export function abilitiesOf(
  project: ProjectRow,
  viewer: Viewer | null,
  member: MemberRow | null,
  lang?: string,
  area?: string,
): Abilities {
  const admin = member?.role === "admin"
  const scoped = !!member && covers(member.languages, lang) && covers(member.areas, area)
  const review = admin || (member?.role === "reviewer" && scoped)
  const translate =
    review ||
    (member?.role === "translator" && scoped) ||
    (!!viewer && project.whoTranslates === "anyone" && !project.private)
  return { admin, review, translate }
}

export async function visibleProject(owner: string, name: string, viewer: Viewer | null) {
  const project = await findProject(owner, name)
  const member = await membershipOf(project, viewer)
  if (project.private && !member) fail(404, "There's no such project")
  return { project, member }
}
