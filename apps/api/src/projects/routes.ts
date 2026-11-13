import type { AreaSummary, MissingRow, Progress, Project, ProjectSummary } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { stringsOf } from "../strings/client.ts"
import { abilitiesOf, visibleProject } from "./access.ts"
import {
  type AreaProgressRow,
  allAreaProgress,
  areasWithProgress,
  emptyProgress,
  languagesProgress,
} from "./progress.ts"

export const projectRoutes = new Hono<ViewerVars>()
projectRoutes.use(maybeSignedIn)

const progressOf = (row: AreaProgressRow): Progress =>
  row.lang
    ? {
        translated: row.translated,
        review: row.review,
        approved: row.approved,
        problems: row.problems,
        suggested: row.suggested,
      }
    : emptyProgress()
const iconUrl = (icon: string | null) => (icon ? `/api/icons/${icon}` : null)

export function summaryOf(project: ProjectRow): Omit<ProjectSummary, "progress"> {
  return {
    slug: project.slug,
    owner: project.owner,
    name: project.name,
    description: project.description,
    icon: project.icon ? `/api/icons/${project.icon}` : null,
    strings: project.strings,
    words: project.words,
    languages: project.languages.length,
    state: project.state,
    importing:
      project.state === "scanning"
        ? {
            total: project.importTotal,
            done: project.importDone,
            startedAt: project.importStartedAt?.getTime() ?? null,
          }
        : null,
  }
}

projectRoutes.get("/:owner/:name", async (c) => {
  const viewer = c.get("viewer")
  const { project, member } = await visibleProject(c.req.param("owner"), c.req.param("name"), viewer)
  const languages = languagesProgress(project, project.languages)
  return c.json({
    ...summaryOf(project),
    sourceLang: project.sourceLang,
    languages,
    problem: project.problem,
    paused: project.pausedAt !== null,
    syncedAt: project.syncedAt?.getTime() ?? null,
    headSha: project.headSha,
    delivery: project.delivery,
    whoTranslates: project.whoTranslates,
    role: member?.role ?? null,
    can: abilitiesOf(project, viewer, member),
  } satisfies Project)
})

projectRoutes.get("/:owner/:name/areas", async (c) => {
  const { lang } = readQuery(c, z.object({ lang: z.string().optional() }))
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const rows = await areasWithProgress(project, lang ?? null)
  return c.json(
    rows.map(
      (row): AreaSummary => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: iconUrl(row.icon),
        strings: row.strings,
        words: row.words,
        progress: lang ? progressOf(row) : null,
      }),
    ),
  )
})

projectRoutes.get("/:owner/:name/missing", async (c) => {
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const [areas, rows] = await Promise.all([areasWithProgress(project, null), allAreaProgress(project)])
  const byKey = new Map(rows.map((row) => [`${row.lang}:${row.id}`, row]))
  return c.json(
    project.languages.map(
      (lang): MissingRow => ({
        lang,
        areas: areas.map((area) => {
          const found = byKey.get(`${lang}:${area.id}`)
          return {
            slug: area.slug,
            name: area.name,
            missing: area.strings - (found?.translated ?? 0),
            review: found?.review ?? 0,
            problems: found?.problems ?? 0,
          }
        }),
      }),
    ),
  )
})

const settings = z.object({
  delivery: z.enum(schema.DELIVERIES).optional(),
  whoTranslates: z.enum(schema.WHO_TRANSLATES).optional(),
})

projectRoutes.patch("/:owner/:name/settings", async (c) => {
  const viewer = c.get("viewer")
  const { project, member } = await visibleProject(c.req.param("owner"), c.req.param("name"), viewer)
  if (!abilitiesOf(project, viewer, member).admin) fail(403, "Only the project's maintainers can change this")
  const changes = await readBody(c, settings)
  await db.update(schema.project).set(changes).where(eq(schema.project.id, project.id))
  if (changes.delivery && changes.delivery !== "off") await stringsOf(project).deliverAfter(0)
  return c.body(null, 204)
})
