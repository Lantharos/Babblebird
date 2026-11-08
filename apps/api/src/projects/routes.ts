import type { AreaSummary, MissingRow, Progress, Project, ProjectSummary } from "@babblebird/protocol"
import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { shard } from "../db/strings.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { abilitiesOf, visibleProject } from "./access.ts"
import {
  type AreaProgressRow,
  allAreaProgress,
  areasWithProgress,
  emptyProgress,
  languagesProgress,
  projectsProgress,
} from "./progress.ts"

export const projectRoutes = new Hono<ViewerVars>()
projectRoutes.use(maybeSignedIn)

const PAGE = 24

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

projectRoutes.get("/", async (c) => {
  const { lang, page } = readQuery(
    c,
    z.object({ lang: z.string().optional(), page: z.coerce.number().int().min(0).default(0) }),
  )
  const viewer = c.get("viewer")
  const mine = viewer
    ? db
        .select({ id: schema.member.projectId })
        .from(schema.member)
        .where(eq(schema.member.userId, viewer.id))
    : null
  const rows = await db
    .select()
    .from(schema.project)
    .where(
      and(
        inArray(schema.project.state, ["ready", "scanning"]),
        mine
          ? or(eq(schema.project.private, false), inArray(schema.project.id, mine))
          : eq(schema.project.private, false),
      ),
    )
    .orderBy(
      desc(sql`${schema.project.owner} = 'Lantharos'`),
      desc(schema.project.strings),
      schema.project.slug,
    )
    .limit(PAGE + 1)
    .offset(page * PAGE)
  const shown = rows.slice(0, PAGE)
  const progress = new Map<string, ProjectSummary["progress"]>()
  if (lang)
    for (const [index, group] of Map.groupBy(shown, (project) => project.shard)) {
      const found = await projectsProgress(
        shard({ shard: index }),
        group.map((project) => project.id),
        lang,
      )
      for (const project of group) progress.set(project.id, found.get(project.id) ?? emptyProgress())
    }
  const offered = await db
    .selectDistinct({ lang: sql<string>`j.value` })
    .from(sql`${schema.project}, json_each(${schema.project.languages}) j`)
    .where(and(eq(schema.project.private, false), eq(schema.project.state, "ready")))
  return c.json({
    languages: offered.map((row) => row.lang),
    projects: shown.map((project) => ({ ...summaryOf(project), progress: progress.get(project.id) ?? null })),
    more: rows.length > PAGE,
  })
})

projectRoutes.get("/:owner/:name", async (c) => {
  const viewer = c.get("viewer")
  const { project, member } = await visibleProject(c.req.param("owner"), c.req.param("name"), viewer)
  const languages = await languagesProgress(shard(project), project.id, project.languages)
  return c.json({
    ...summaryOf(project),
    sourceLang: project.sourceLang,
    languages,
    problem: project.problem,
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
  const rows = await areasWithProgress(shard(project), project.id, lang ?? null)
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
  const db = shard(project)
  const [areas, rows] = await Promise.all([
    areasWithProgress(db, project.id, null),
    allAreaProgress(db, project.id),
  ])
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
  return c.body(null, 204)
})
