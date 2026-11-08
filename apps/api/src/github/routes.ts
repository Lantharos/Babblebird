import { Hono } from "hono"
import { handleEvent } from "./events/index.ts"
import { verifiedPayload } from "./webhook.ts"

export const githubRoutes = new Hono()

githubRoutes.post("/webhook", async (c) => {
  const { event, payload } = await verifiedPayload(c.req.raw)
  c.executionCtx.waitUntil(handleEvent(event, payload))
  return c.body(null, 202)
})
