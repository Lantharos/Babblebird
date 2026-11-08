import type { ImportStatus, ProjectSummary } from "@babblebird/protocol"
import { and, eq, inArray, ne, or } from "drizzle-orm"
import { Hono } from "hono"
import { type SignedInVars, signedIn } from "../auth/session.ts"
import { db, schema } from "../db/core.ts"
import { all, shard, shardsInUse } from "../db/strings.ts"
import { userInstallations } from "../github/user.ts"
import { fail } from "../lib/http.ts"
import { visibleProject } from "./access.ts"
import { summaryOf } from "./routes.ts"

export const mineRoutes = new Hono<SignedInVars>()

async function projectsFor(userId: string, installations: number[], installation?: number) {
  if (installation !== undefined && !installations.includes(installation)) return null
  const memberOf = db
    .select({ id: schema.member.projectId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
  return db
    .select()
    .from(schema.project)
    .where(
      and(
        ne(schema.project.state, "removed"),
        installation !== undefined
          ? eq(schema.project.installationId, installation)
          : or(
              inArray(schema.project.installationId, installations.length ? installations : [-1]),
              inArray(schema.project.id, memberOf),
            ),
      ),
    )
    .orderBy(schema.project.slug)
}

mineRoutes.get("/me/projects", signedIn, async (c) => {
  const viewer = c.get("viewer")
  const owned = await userInstallations(viewer.id)
  const [projects, roles] = await Promise.all([
    projectsFor(viewer.id, owned),
    db.select().from(schema.member).where(eq(schema.member.userId, viewer.id)),
  ])
  const installations = new Set(owned)
  return c.json(
    projects!.map((project) => {
      const member = roles.find((role) => role.projectId === project.id)
      return {
        ...summaryOf(project),
        progress: null,
        role: installations.has(project.installationId) ? "admin" : (member?.role ?? null),
        memberLanguages: member?.languages ?? null,
      }
    }),
  )
})

mineRoutes.get("/me/work", signedIn, async (c) => {
  const viewer = c.get("viewer")
  const rows = (
    await Promise.all(
      (
        await shardsInUse()
      ).map((index) =>
        all<{ project_id: string; lang: string; key: string | null; kind: string; at: number }>(
          shard({ shard: index })
            .prepare(
              `SELECT a.project_id, a.lang, s.key, a.kind, a.at FROM activity a LEFT JOIN source s ON s.id = a.source_id
               WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 20`,
            )
            .bind(viewer.id),
        ),
      ),
    )
  ).flat()
  const slugs = new Map(
    (
      await db
        .select({ id: schema.project.id, slug: schema.project.slug })
        .from(schema.project)
        .where(inArray(schema.project.id, [...new Set(rows.map((row) => row.project_id)), ""]))
    ).map((row) => [row.id, row.slug]),
  )
  return c.json(
    rows
      .sort((a, b) => b.at - a.at)
      .slice(0, 20)
      .map((row) => ({
        project: slugs.get(row.project_id) ?? "",
        lang: row.lang,
        key: row.key,
        kind: row.kind,
        at: row.at,
      })),
  )
})

mineRoutes.get("/installations/:id{\\d+}", signedIn, async (c) => {
  const viewer = c.get("viewer")
  const projects = await projectsFor(viewer.id, await userInstallations(viewer.id), Number(c.req.param("id")))
  if (!projects) fail(404, "That installation isn't yours, or GitHub hasn't told us about it yet")
  return c.json(projects.map((project): ProjectSummary => ({ ...summaryOf(project), progress: null })))
})

mineRoutes.get("/projects/:owner/:name/import", async (c) => {
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), null)
  const strings = shard(project)
  const [areas, translated] = await Promise.all([
    all<{ slug: string; name: string; icon: string | null; strings: number }>(
      strings
        .prepare("SELECT slug, name, icon, strings FROM area WHERE project_id = ? ORDER BY position")
        .bind(project.id),
    ),
    all<{ count: number }>(
      strings
        .prepare("SELECT coalesce(sum(translated), 0) count FROM progress WHERE project_id = ?")
        .bind(project.id),
    ),
  ])
  const summary = summaryOf(project)
  return c.json({
    state: project.state,
    problem: project.problem,
    importing: summary.importing,
    areas: areas.map((area) => ({ ...area, icon: area.icon ? `/api/icons/${area.icon}` : null })),
    strings: project.strings,
    translations: translated[0]?.count ?? 0,
    languages: project.languages.length,
  } satisfies ImportStatus)
})
