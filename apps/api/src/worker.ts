import { withEnv } from "cloudflare:workers"
import site from "@babblebird/web/worker"
import type { DeliverJob } from "./deliver/deliver.ts"
import api from "./index.ts"
import type { SyncJob } from "./sync/jobs.ts"

export { Memory, ProjectStrings } from "./index.ts"

export default {
  fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/api/")) return api.fetch(request, env, ctx)
    const API = { fetch: (inner: Request) => api.fetch(inner, env, ctx) }
    return withEnv({ ...env, API }, () => site.fetch(request, env, ctx)) as Promise<Response>
  },
  queue: api.queue,
  scheduled: api.scheduled,
  email: api.email,
} satisfies ExportedHandler<Env, SyncJob | DeliverJob>
