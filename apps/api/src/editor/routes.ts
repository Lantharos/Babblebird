import {
  FILTERS,
  type FoundString,
  type StringDetail,
  type StringPage,
  type StringRow,
} from "@babblebird/protocol"
import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { accessFor, PAUSED, visibleProject } from "../projects/access.ts"
import { query, stringsOf } from "../strings/client.ts"
import { VIEWER_HEADER } from "../strings/live.ts"
import { detailView } from "./detail.ts"
import { peopleById, personOf } from "./people.ts"
import { rowsOf } from "./rows.ts"
import { noteContribution, rememberLanguage } from "./save.ts"
import type { Edit, EditResult } from "./store.ts"

export const editorRoutes = new Hono<ViewerVars>()
editorRoutes.use(maybeSignedIn)

type Ctx = Context<ViewerVars>

const lang = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
const PAGE = 50
const FOUND = 50

const project = (c: Ctx) => visibleProject(c.req.param("owner")!, c.req.param("name")!, c.get("viewer"))

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
    }),
  )
  const records = await stringsOf((await project(c)).project).page({
    area: c.req.param("area"),
    lang: query.lang,
    filter: query.filter,
    after: query.after ? (query.after.split(".").map(Number) as [number, number]) : null,
    limit: PAGE + 1,
  })
  const shown = records.slice(0, PAGE)
  const last = shown.at(-1)
  return c.json({
    rows: await rowsOf(shown),
    next: records.length > PAGE && last ? `${last.file_position}.${last.position}` : null,
  } satisfies StringPage)
})

editorRoutes.get("/:owner/:name/search", async (c) => {
  const { lang: language, q } = readQuery(c, z.object({ lang, q: z.string().trim().min(1).max(200) }))
  const records = await stringsOf((await project(c)).project).search(language, q, FOUND)
  const rows = await rowsOf(records)
  return c.json(rows.map((row, index): FoundString => ({ ...row, area: records[index]!.area_slug })))
})

editorRoutes.get("/:owner/:name/strings/:id{\\d+}", async (c) => {
  const { lang: language } = readQuery(c, z.object({ lang }))
  const found = await project(c)
  const detail = await stringsOf(found.project).detail(
    Number(c.req.param("id")),
    language,
    found.project.sourceLang,
  )
  if (!detail) fail(404, "There's no such string")
  const [row] = await rowsOf([detail.record])
  return c.json({ row: row!, ...(await detailView(found.project, detail, language)) } satisfies {
    row: StringRow
  } & StringDetail)
})

async function edit(c: Ctx, change: () => Edit | Promise<Edit>) {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const found = await project(c)
  if (found.project.pausedAt) fail(409, PAUSED)
  const kind = await change()
  if (kind.kind !== "suggested" && language === found.project.sourceLang)
    fail(403, "The source language changes in the repository")
  const access = accessFor(found.project, viewer, found.member, language)
  const result: EditResult = await stringsOf(found.project).edit({
    id: Number(c.req.param("id")),
    lang: language,
    userId: viewer.id,
    edit: kind,
    scope: kind.kind === "approved" ? access.review : access.translate,
  })
  if (result.status === "rejected") {
    if (result.problems) return c.json({ error: result.error, problems: result.problems }, 422)
    fail(result.code, result.error)
  }
  await Promise.all([
    kind.kind === "approved" ? null : rememberLanguage(viewer.id, language),
    noteContribution(viewer.id, found.project.id, kind.kind === "suggested" ? 0 : 1),
  ])
  return result
}

const saving = z.object({ body: z.string().min(1).max(20_000), approve: z.boolean().default(false) })

editorRoutes.put("/:owner/:name/strings/:id{\\d+}/:lang", async (c) => {
  const outcome = await edit(c, async () => {
    const { body, approve } = await readBody(c, saving)
    return { kind: approve ? "approved" : "translated", body }
  })
  if (outcome instanceof Response) return outcome
  const [row] = await rowsOf([outcome.record])
  return c.json({ row: row!, problems: outcome.problems })
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/approve", async (c) => {
  const outcome = await edit(c, () => ({ kind: "approved", body: null }))
  return outcome instanceof Response ? outcome : c.body(null, 204)
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/suggestions", async (c) => {
  const outcome = await edit(c, async () => ({ kind: "suggested", body: (await readBody(c, saving)).body }))
  return outcome instanceof Response ? outcome : c.body(null, 204)
})

editorRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/suggestions/:suggestion{\\d+}/accept", async (c) => {
  const outcome = await edit(c, () => ({ kind: "accepted", suggestion: Number(c.req.param("suggestion")) }))
  return outcome instanceof Response ? outcome : c.body(null, 204)
})

editorRoutes.delete("/:owner/:name/strings/:id{\\d+}/:lang/suggestions/:suggestion{\\d+}", async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const found = await project(c)
  const access = accessFor(found.project, viewer, found.member, language)
  const dropped = await stringsOf(found.project).dropSuggestion(
    Number(c.req.param("id")),
    language,
    Number(c.req.param("suggestion")),
    access.translate === false ? viewer.id : null,
  )
  if (!dropped) fail(404, "There's no such string")
  return c.body(null, 204)
})

editorRoutes.get("/:owner/:name/activity", async (c) => {
  const params = readQuery(c, z.object({ lang: lang.optional(), before: z.coerce.number().int().optional() }))
  const rows = await query<{
    id: number
    kind: string
    lang: string | null
    source_id: number | null
    key: string | null
    user_id: string | null
    detail: string | null
    at: number
  }>(
    (await project(c)).project,
    `SELECT a.id, a.kind, a.lang, a.source_id, s.key, a.user_id, a.detail, a.at FROM activity a LEFT JOIN source s ON s.id = a.source_id
     WHERE a.id < ?1 ${params.lang ? "AND a.lang = ?2" : ""} ORDER BY a.id DESC LIMIT ${PAGE}`,
    params.before ?? Number.MAX_SAFE_INTEGER,
    ...(params.lang ? [params.lang] : []),
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

editorRoutes.get("/:owner/:name/live", async (c) => {
  if (c.req.header("upgrade") !== "websocket") fail(400, "This only speaks WebSocket")
  const { lang: language } = readQuery(c, z.object({ lang }))
  const viewer = c.get("viewer")
  const url = new URL(c.req.url)
  url.search = new URLSearchParams({ lang: language }).toString()
  return stringsOf((await project(c)).project).fetch(
    new Request(url, {
      headers: {
        upgrade: "websocket",
        ...(viewer && {
          [VIEWER_HEADER]: JSON.stringify({
            id: viewer.id,
            name: viewer.name || "A translator",
            image: viewer.image,
          }),
        }),
      },
    }),
  )
})
