import type { Question } from "@babblebird/protocol"
import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { peopleById, personOf } from "../editor/people.ts"
import { fail, readBody } from "../lib/http.ts"
import type { ReplyPayload } from "../notices/mails.ts"
import { queueNotices, translatorsOf } from "../notices/queue.ts"
import { accessFor, allows, PAUSED, visibleProject } from "../projects/access.ts"
import { asAdmin } from "../projects/manage.ts"
import { stringsOf } from "../strings/client.ts"
import { ENGLISH } from "./store.ts"

export const commentRoutes = new Hono<ViewerVars>()
commentRoutes.use(maybeSignedIn)

const lang = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
const EXCERPT = 280

const nameOf = async (id: string) => (await peopleById([id])).get(id)?.name ?? "A translator"

async function load(c: Context<ViewerVars>) {
  const viewer = c.get("viewer")
  if (!viewer) fail(401, "Sign in first")
  const language = lang.parse(c.req.param("lang"))
  const found = await visibleProject(c.req.param("owner")!, c.req.param("name")!, viewer)
  if (found.project.pausedAt) fail(409, PAUSED)
  return { ...found, viewer, language, id: Number(c.req.param("id")) }
}

commentRoutes.post("/:owner/:name/strings/:id{\\d+}/:lang/comments", async (c) => {
  const { project, viewer, language, id } = await load(c)
  const { body, english } = await readBody(
    c,
    z.object({ body: z.string().trim().min(1).max(4000), english: z.boolean() }),
  )
  const threadLang = english ? ENGLISH : language
  const added = await stringsOf(project).comment({ sourceId: id, lang: threadLang, userId: viewer.id, body })
  if (!added) fail(404, "There's no such string")
  const author = await nameOf(viewer.id)
  await queueNotices(
    added.participants.map((userId) => ({
      userId,
      projectId: project.id,
      kind: "reply" as const,
      payload: {
        sourceId: id,
        key: added.key,
        area: added.area,
        lang: threadLang,
        view: language,
        author,
        excerpt: body.length > EXCERPT ? `${body.slice(0, EXCERPT)}…` : body,
      } satisfies ReplyPayload,
    })),
  )
  return c.body(null, 204)
})

commentRoutes.put("/:owner/:name/strings/:id{\\d+}/:lang/comments/resolved", async (c) => {
  const { project, member, viewer, language, id } = await load(c)
  const { english, resolved } = await readBody(c, z.object({ english: z.boolean(), resolved: z.boolean() }))
  const access = accessFor(project, viewer, member, english ? undefined : language)
  if (!(english ? member?.role === "admin" || allows(access.translate) : allows(access.translate)))
    fail(403, "Only translators of this language can close this discussion")
  await stringsOf(project).resolveThread(id, english ? ENGLISH : language, viewer.id, resolved)
  return c.body(null, 204)
})

commentRoutes.get("/:owner/:name/questions", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const rows = await stringsOf(project).questions()
  const people = await peopleById(rows.map((row) => row.user_id))
  return c.json(
    rows.map(
      (row): Question => ({
        id: row.id,
        key: row.key,
        area: row.area,
        comments: row.comments,
        last: { id: row.comment_id, body: row.body, at: row.at, by: personOf(people, row.user_id, null) },
      }),
    ),
  )
})

const announcement = z.object({
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
  lang: lang.nullable(),
})

commentRoutes.post("/:owner/:name/announcements", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const { subject, body, lang: only } = await readBody(c, announcement)
  const recipients = await translatorsOf(project, only)
  const from = await nameOf(c.get("viewer")!.id)
  await queueNotices(
    recipients.map((recipient) => ({
      userId: recipient.id,
      projectId: project.id,
      kind: "announcement" as const,
      payload: { subject, body, from },
    })),
  )
  return c.json({ recipients: recipients.length })
})
