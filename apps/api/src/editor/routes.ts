import {
  FILTERS,
  STATE,
  type StringDetail,
  type StringPage,
  type StringRow,
  stateName,
} from "@babblebird/protocol"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { all, first, shard } from "../db/strings.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { abilitiesOf, visibleProject } from "../projects/access.ts"
import { recountArea } from "../sync/apply/progress.ts"
import { contextFor } from "./context.ts"
import { peopleById, personOf } from "./people.ts"
import { type StringRecord, stringById, stringPage } from "./queries.ts"
import { checkTranslation, saveTranslation, stateFor } from "./save.ts"

export const editorRoutes = new Hono<ViewerVars>()
editorRoutes.use(maybeSignedIn)

const lang = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
const PAGE = 50

async function rowsOf(records: StringRecord[]): Promise<StringRow[]> {
  const people = await peopleById(records.map((record) => record.t_by))
  return records.map((record) => ({
    id: record.id,
    key: record.key,
    file: record.pattern,
    position: record.position,
    body: record.body,
    comment: record.comment,
    section: record.section,
    words: record.words,
    suggestions: record.suggestions,
    translation:
      record.t_body === null
        ? null
        : {
            body: record.t_body,
            state: stateName(record.t_state),
            flags: record.t_flags ?? 0,
            by: personOf(people, record.t_by, record.t_credit),
            at: record.t_at ?? 0,
            stale: record.t_source_hash !== record.hash,
          },
  }))
}

async function areaOf(db: D1Database, projectId: string, slug: string) {
  const area = await first<{ id: number; slug: string }>(
    db.prepare("SELECT id, slug FROM area WHERE project_id = ? AND slug = ?").bind(projectId, slug),
  )
  if (!area) fail(404, "There's no such area")
  return area
}

editorRoutes.get("/:owner/:name/areas/:area/strings", async (c) => {
  const query = readQuery(
    c,
    z.object({
      lang,
      filter: z.enum(FILTERS).default("all"),
      after: z
        .string()
        .regex(/^\d+\.\d+$/)
        .optional(),
      q: z.string().trim().max(200).optional(),
    }),
  )
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const db = shard(project)
  const area = await areaOf(db, project.id, c.req.param("area"))
  const records = await stringPage(db, {
    areaId: area.id,
    lang: query.lang,
    filter: query.filter,
    after: query.after ? (query.after.split(".").map(Number) as [number, number]) : null,
    search: query.q || null,
    limit: PAGE + 1,
  })
  const shown = records.slice(0, PAGE)
  const last = shown.at(-1)
  return c.json({
    rows: await rowsOf(shown),
    next: records.length > PAGE && last ? `${last.file_position}.${last.position}` : null,
  } satisfies StringPage)
})

async function loadString(
  c: { req: { param: (name: string) => string } },
  viewer: ViewerVars["Variables"]["viewer"],
  language: string,
) {
  const { project, member } = await visibleProject(c.req.param("owner"), c.req.param("name"), viewer)
  const db = shard(project)
  const record = await stringById(db, project.id, Number(c.req.param("id")), language)
  if (!record) fail(404, "There's no such string")
  const area = await first<{ slug: string }>(
    db.prepare("SELECT slug FROM area WHERE id = ?").bind(record.area_id),
  )
  return { project, member, db, record, can: abilitiesOf(project, viewer, member, language, area?.slug) }
}

editorRoutes.get("/:owner/:name/strings/:id{\\d+}", async (c) => {
  const { lang: language } = readQuery(c, z.object({ lang }))
  const { project, db, record } = await loadString(c, c.get("viewer"), language)
  const [row] = await rowsOf([record])
  return c.json({ row: row!, ...(await contextFor(db, project, record, language)) } satisfies {
    row: StringRow
  } & StringDetail)
})

const saving = z.object({ body: z.string().min(1).max(20_000), approve: z.boolean().default(false) })

editorRoutes.put("/:owner/:name/strings/:id{\\d+}/:lang", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const { project, db, record, can } = await loadString(c, viewer, language)
  if (language === project.sourceLang) fail(403, "The source language changes in the repository")
  const { body, approve } = await readBody(c, saving)
  if (!can.translate) fail(403, "You can suggest a translation here, but not save one")
  if (approve && !can.review) fail(403, "Only reviewers of this language can approve")
  const problems = await checkTranslation(db, { project, record, lang: language, body })
  if (problems.some((problem) => problem.severity === "error"))
    return c.json({ error: problems[0]!.text, problems }, 422)
  await saveTranslation(
    db,
    {
      project,
      record,
      lang: language,
      body,
      state: stateFor(approve),
      userId: viewer.id,
      kind: approve ? "approved" : "translated",
    },
    problems,
  )
  const [row] = await rowsOf([(await stringById(db, project.id, record.id, language))!])
  return c.json({ row: row!, problems })
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/approve", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const { project, db, record, can } = await loadString(c, viewer, language)
  if (!can.review) fail(403, "Only reviewers of this language can approve")
  if (record.t_body === null) fail(409, "There's nothing to approve yet")
  const problems = await checkTranslation(db, { project, record, lang: language, body: record.t_body })
  await saveTranslation(
    db,
    {
      project,
      record,
      lang: language,
      body: record.t_body,
      state: STATE.approved,
      userId: viewer.id,
      kind: "approved",
    },
    problems,
  )
  return c.body(null, 204)
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/suggestions", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const { project, db, record } = await loadString(c, viewer, language)
  const { body } = await readBody(c, saving)
  const problems = await checkTranslation(db, { project, record, lang: language, body })
  if (problems.some((problem) => problem.severity === "error"))
    return c.json({ error: problems[0]!.text, problems }, 422)
  await db
    .prepare("INSERT INTO suggestion (source_id, lang, body, by, at) VALUES (?, ?, ?, ?, ?)")
    .bind(record.id, language, body, viewer.id, Date.now())
    .run()
  await recountArea(db, project.id, record.area_id, [language])
  return c.body(null, 204)
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/suggestions/:suggestion{\\d+}/accept", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const { project, db, record, can } = await loadString(c, viewer, language)
  if (!can.translate) fail(403, "You can't accept suggestions here")
  const suggestion = await first<{ body: string }>(
    db
      .prepare("SELECT body FROM suggestion WHERE id = ? AND source_id = ? AND lang = ?")
      .bind(c.req.param("suggestion"), record.id, language),
  )
  if (!suggestion) fail(404, "That suggestion is gone")
  const problems = await checkTranslation(db, { project, record, lang: language, body: suggestion.body })
  await db.prepare("DELETE FROM suggestion WHERE source_id = ? AND lang = ?").bind(record.id, language).run()
  await saveTranslation(
    db,
    {
      project,
      record,
      lang: language,
      body: suggestion.body,
      state: STATE.translated,
      userId: viewer.id,
      kind: "accepted",
    },
    problems,
  )
  return c.body(null, 204)
})

editorRoutes.delete("/:owner/:name/strings/:id{\\d+}/:lang/suggestions/:suggestion{\\d+}", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const { project, db, record, can } = await loadString(c, viewer, language)
  const owner = can.translate ? "" : "AND by = ?4"
  await db
    .prepare(`DELETE FROM suggestion WHERE id = ?1 AND source_id = ?2 AND lang = ?3 ${owner}`)
    .bind(c.req.param("suggestion"), record.id, language, ...(can.translate ? [] : [viewer.id]))
    .run()
  await recountArea(db, project.id, record.area_id, [language])
  return c.body(null, 204)
})

editorRoutes.get("/:owner/:name/activity", async (c) => {
  const query = readQuery(c, z.object({ lang: lang.optional(), before: z.coerce.number().int().optional() }))
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const rows = await all<{
    id: number
    kind: string
    lang: string | null
    source_id: number | null
    key: string | null
    user_id: string | null
    detail: string | null
    at: number
  }>(
    shard(project)
      .prepare(
        `SELECT a.id, a.kind, a.lang, a.source_id, s.key, a.user_id, a.detail, a.at FROM activity a LEFT JOIN source s ON s.id = a.source_id
         WHERE a.project_id = ?1 AND a.id < ?2 ${query.lang ? "AND a.lang = ?3" : ""} ORDER BY a.id DESC LIMIT ${PAGE}`,
      )
      .bind(project.id, query.before ?? Number.MAX_SAFE_INTEGER, ...(query.lang ? [query.lang] : [])),
  )
  const people = await peopleById(rows.map((row) => row.user_id))
  return c.json(
    rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      lang: row.lang,
      key: row.key,
      sourceId: row.source_id,
      detail: row.detail,
      by: personOf(people, row.user_id, null),
      at: row.at,
    })),
  )
})
