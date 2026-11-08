import { env } from "cloudflare:workers"
import { Hono } from "hono"
import { authRoutes } from "./auth/routes.ts"
import { badgeRoutes } from "./badge/routes.ts"
import { type DeliverJob, deliver, queueDeliveries } from "./deliver/deliver.ts"
import { editorRoutes } from "./editor/routes.ts"
import { fileRoutes } from "./files/routes.ts"
import { githubRoutes } from "./github/routes.ts"
import { receiveMail } from "./inbox/receive.ts"
import { errorResponse, fail } from "./lib/http.ts"
import { meRoutes } from "./me/routes.ts"
import { deliverPending } from "./ops/pending.ts"
import { backOffice, publishDefinitions } from "./ops/pult.ts"
import { glossaryRoutes } from "./projects/glossary.ts"
import { listRoutes } from "./projects/list.ts"
import { manageRoutes } from "./projects/manage.ts"
import { memberRoutes } from "./projects/members.ts"
import { mineRoutes } from "./projects/mine.ts"
import { projectRoutes } from "./projects/routes.ts"
import { screenshotRoutes } from "./screenshots/routes.ts"
import { consumeSync } from "./sync/consumer.ts"
import type { SyncJob } from "./sync/jobs.ts"
import { rescanStale } from "./sync/retry.ts"

const app = new Hono().basePath("/api")

app.onError((error, c) => {
  const known = errorResponse(error)
  if (known) return known
  console.error(error)
  return c.json({ error: "Something went wrong" }, 500)
})

app.use(async (_, next) => {
  if (!env.BETTER_AUTH_SECRET || !env.GITHUB_APP_PRIVATE_KEY) fail(503, "Babblebird isn't set up yet")
  await next()
})

app.post("/ops", (c) => {
  const office = backOffice()
  if (!office) fail(404, "Not found")
  return office.handle(c.req.raw, c.executionCtx)
})
app.get("/sign-in-options", (c) => c.json({ google: !!env.GOOGLE_CLIENT_ID }))
app.route("/auth", authRoutes)
app.route("/badge", badgeRoutes)
app.route("/github", githubRoutes)
app.route("/me", meRoutes)
app.route("/", mineRoutes)
app.route("/projects", listRoutes)
app.route("/projects", projectRoutes)
app.route("/projects", editorRoutes)
app.route("/projects", memberRoutes)
app.route("/projects", manageRoutes)
app.route("/projects", glossaryRoutes)
app.route("/projects", screenshotRoutes)
app.route("/", fileRoutes)
app.all("*", (c) => c.json({ error: "Not found" }, 404))

export default {
  fetch: app.fetch,
  async queue(batch) {
    if (batch.queue === "babblebird-sync") await consumeSync(batch as MessageBatch<SyncJob>)
    else for (const message of (batch as MessageBatch<DeliverJob>).messages) await deliver(message.body)
  },
  async scheduled() {
    const office = backOffice()
    await Promise.all([
      queueDeliveries(),
      rescanStale(),
      publishDefinitions(),
      office && deliverPending(office.pult),
    ])
  },
  email: receiveMail,
} satisfies ExportedHandler<Env, SyncJob | DeliverJob>
