import type { LanguageProgress, ProjectSummary } from "@babblebird/protocol"
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { db, type ProjectRow, schema } from "../db/core.ts"
import { shard } from "../db/strings.ts"
import { readQuery } from "../lib/http.ts"
import { projectsProgress } from "./progress.ts"
import { summaryOf } from "./routes.ts"

export const listRoutes = new Hono<ViewerVars>()
listRoutes.use(maybeSignedIn)

const PAGE = 24
const NEEDY_LIMIT = 500

const query = z.object({
  q: z.string().trim().max(100).optional(),
  langs: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean).slice(0, 10) : [])),
  needs: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(0).default(0),
})

const escaped = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`

const missingIn = (project: ProjectRow, progress: LanguageProgress[]) =>
  progress.reduce((sum, language) => sum + project.strings - language.translated + language.review, 0)

async function withProgress(rows: ProjectRow[], langs: string[]) {
  const progress = new Map<string, LanguageProgress[]>()
  for (const [index, group] of Map.groupBy(rows, (project) => project.shard)) {
    const found = await projectsProgress(
      shard({ shard: index }),
      group.map((project) => project.id),
      langs,
    )
    for (const project of group) {
      const known = found.get(project.id) ?? []
      progress.set(
        project.id,
        langs
          .filter((lang) => project.languages.includes(lang))
          .map(
            (lang) =>
              known.find((entry) => entry.lang === lang) ?? {
                lang,
                translated: 0,
                review: 0,
                approved: 0,
                problems: 0,
                suggested: 0,
              },
          ),
      )
    }
  }
  return progress
}

listRoutes.get("/", async (c) => {
  const { q, langs, needs, page } = readQuery(c, query)
  const viewer = c.get("viewer")
  const mine = viewer
    ? db
        .select({ id: schema.member.projectId })
        .from(schema.member)
        .where(eq(schema.member.userId, viewer.id))
    : null
  const search = q
    ? or(like(schema.project.slug, escaped(q.toLowerCase())), like(schema.project.description, escaped(q)))
    : undefined
  const visible = and(
    inArray(schema.project.state, ["ready", "scanning"]),
    mine
      ? or(eq(schema.project.private, false), inArray(schema.project.id, mine))
      : eq(schema.project.private, false),
    search,
  )
  const ordered = db
    .select()
    .from(schema.project)
    .where(visible)
    .orderBy(
      desc(sql`${schema.project.owner} = 'Lantharos'`),
      desc(schema.project.strings),
      schema.project.slug,
    )
  let shown: ProjectRow[]
  let more: boolean
  let progress: Map<string, LanguageProgress[]>
  if (needs && langs.length) {
    const candidates = (await ordered.limit(NEEDY_LIMIT)).filter((project) =>
      langs.some((lang) => project.languages.includes(lang)),
    )
    progress = await withProgress(candidates, langs)
    const needy = candidates
      .map((project) => ({ project, missing: missingIn(project, progress.get(project.id) ?? []) }))
      .filter((entry) => entry.missing > 0)
      .sort((a, b) => b.missing - a.missing)
    shown = needy.slice(page * PAGE, (page + 1) * PAGE).map((entry) => entry.project)
    more = needy.length > (page + 1) * PAGE
  } else {
    const rows = await ordered.limit(PAGE + 1).offset(page * PAGE)
    shown = rows.slice(0, PAGE)
    more = rows.length > PAGE
    progress = langs.length ? await withProgress(shown, langs) : new Map()
  }
  const offered = await db
    .selectDistinct({ lang: sql<string>`j.value` })
    .from(sql`${schema.project}, json_each(${schema.project.languages}) j`)
    .where(and(eq(schema.project.private, false), eq(schema.project.state, "ready")))
  return c.json({
    languages: offered.map((row) => row.lang),
    projects: shown.map(
      (project): ProjectSummary => ({ ...summaryOf(project), progress: progress.get(project.id) ?? null }),
    ),
    more,
  })
})
