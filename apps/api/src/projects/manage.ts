import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { db, schema } from "../db/core.ts"
import { installationToken } from "../github/app.ts"
import { fail } from "../lib/http.ts"
import { all, stringsOf } from "../strings/client.ts"
import { scanHead } from "../sync/head.ts"
import { abilitiesOf, PAUSED, visibleProject } from "./access.ts"

export const manageRoutes = new Hono<ViewerVars>()
manageRoutes.use(maybeSignedIn)

const HISTORY = 30

async function asAdmin(owner: string, name: string, viewer: ViewerVars["Variables"]["viewer"]) {
  const found = await visibleProject(owner, name, viewer)
  if (!abilitiesOf(found.project, viewer, found.member).admin)
    fail(403, "Only the project's maintainers can do this")
  return found.project
}

manageRoutes.post("/:owner/:name/sync", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  if (project.pausedAt) fail(409, PAUSED)
  await installationToken(project.installationId).catch(() =>
    fail(409, "Babblebird isn't installed on this repository any more. Add it on GitHub again to reconnect."),
  )
  await scanHead(project, { reason: "manual", by: c.get("viewer")?.name ?? null })
  return c.body(null, 202)
})

manageRoutes.get("/:owner/:name/history", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const rows = await all<{ id: number; detail: string; at: number }>(
    stringsOf(project).prepare(
      `SELECT id, detail, at FROM activity WHERE kind = 'synced' ORDER BY id DESC LIMIT ${HISTORY}`,
    ),
  )
  return c.json(rows.map((row) => ({ id: row.id, at: row.at, ...JSON.parse(row.detail) })))
})

manageRoutes.get("/:owner/:name/delivery", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const [delivery, pending] = await Promise.all([
    db.query.delivery.findFirst({ where: eq(schema.delivery.projectId, project.id) }),
    all<{ files: number }>(stringsOf(project).prepare("SELECT count(*) files FROM pending")),
  ])
  return c.json({
    waitingFiles: pending[0]?.files ?? 0,
    pullNumber: delivery?.pullNumber ?? null,
    sentAt: delivery?.sentAt?.getTime() ?? null,
    mergedAt: delivery?.mergedAt?.getTime() ?? null,
    closedAt: delivery?.closedAt?.getTime() ?? null,
    checks: delivery?.checks ?? null,
    problem: delivery?.problem ?? null,
  })
})

manageRoutes.delete("/:owner/:name", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  await db.update(schema.project).set({ state: "removed" }).where(eq(schema.project.id, project.id))
  await stringsOf(project).republish()
  return c.body(null, 204)
})
