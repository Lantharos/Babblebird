import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { noteContribution } from "../editor/save.ts"
import { fail, readBody, readQuery } from "../lib/http.ts"
import { accessFor, allows, PAUSED, visibleProject } from "../projects/access.ts"
import { stringsOf } from "../strings/client.ts"

export const glossaryRoutes = new Hono<ViewerVars>()
glossaryRoutes.use(maybeSignedIn)

const lang = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
const text = (max: number) => z.string().trim().min(1).max(max)

async function load(c: Context<ViewerVars>) {
  const language = lang.parse(c.req.param("lang"))
  const found = await visibleProject(c.req.param("owner")!, c.req.param("name")!, c.get("viewer"))
  if (!found.project.languages.includes(language))
    fail(404, "This project isn't translated into that language")
  const editable =
    !!c.get("viewer") && allows(accessFor(found.project, c.get("viewer"), found.member, language).translate)
  return { ...found, language, editable }
}

async function editor(c: Context<ViewerVars>) {
  const loaded = await load(c)
  if (!c.get("viewer")) fail(401, "Sign in first")
  if (loaded.project.pausedAt) fail(409, PAUSED)
  if (!loaded.editable) fail(403, "Only translators of this language can change its glossary")
  return { ...loaded, viewer: c.get("viewer")! }
}

glossaryRoutes.get("/:owner/:name/glossary/:lang", async (c) => {
  const { project, language, editable } = await load(c)
  return c.json({ terms: await stringsOf(project).glossary(language), editable })
})

const term = z.object({ term: text(200), translation: text(200).nullable(), note: text(500).nullable() })

glossaryRoutes.put("/:owner/:name/glossary/:lang", async (c) => {
  const { project, language, viewer } = await editor(c)
  const body = await readBody(c, term)
  await stringsOf(project).saveTerm({ ...body, lang: language, userId: viewer.id })
  await noteContribution(viewer.id, project.id, 1)
  return c.body(null, 204)
})

glossaryRoutes.delete("/:owner/:name/glossary/:lang", async (c) => {
  const { project, language, viewer } = await editor(c)
  const { term: removed } = readQuery(c, z.object({ term: text(200) }))
  if (!(await stringsOf(project).dropTerm(language, removed, viewer.id))) fail(404, "That term is gone")
  await noteContribution(viewer.id, project.id, 1)
  return c.body(null, 204)
})
