import type { GlossaryEntry } from "@babblebird/protocol"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { all, shard } from "../db/strings.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { abilitiesOf, visibleProject } from "./access.ts"

export const glossaryRoutes = new Hono<ViewerVars>()
glossaryRoutes.use(maybeSignedIn)

const lang = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)

glossaryRoutes.get("/:owner/:name/glossary", async (c) => {
  const query = readQuery(c, z.object({ lang }))
  const { project } = await visibleProject(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  return c.json(
    await all<GlossaryEntry>(
      shard(project)
        .prepare(
          "SELECT id, lang, term, translation, note FROM glossary WHERE project_id = ? AND lang = ? ORDER BY term COLLATE NOCASE",
        )
        .bind(project.id, query.lang),
    ),
  )
})

const entry = z.object({
  lang,
  term: z.string().trim().min(1).max(200),
  translation: z.string().trim().min(1).max(200).nullable(),
  note: z.string().trim().max(500).nullable(),
})

async function asReviewer(
  c: { req: { param: (name: string) => string } },
  viewer: ViewerVars["Variables"]["viewer"],
  language: string,
) {
  const { project, member } = await visibleProject(c.req.param("owner"), c.req.param("name"), viewer)
  if (!abilitiesOf(project, viewer, member, language).review)
    fail(403, "Only reviewers of this language can change its glossary")
  return project
}

glossaryRoutes.put("/:owner/:name/glossary", async (c) => {
  const values = await readBody(c, entry)
  const project = await asReviewer(c, c.get("viewer"), values.lang)
  await shard(project)
    .prepare(
      `INSERT INTO glossary (project_id, lang, term, translation, note) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (project_id, lang, term) DO UPDATE SET translation = excluded.translation, note = excluded.note`,
    )
    .bind(project.id, values.lang, values.term, values.translation, values.note)
    .run()
  return c.body(null, 204)
})

glossaryRoutes.delete("/:owner/:name/glossary/:lang/:id{\\d+}", async (c) => {
  const language = lang.parse(c.req.param("lang"))
  const project = await asReviewer(c, c.get("viewer"), language)
  await shard(project)
    .prepare("DELETE FROM glossary WHERE id = ? AND project_id = ? AND lang = ?")
    .bind(c.req.param("id"), project.id, language)
    .run()
  return c.body(null, 204)
})
