import { env } from "cloudflare:workers"
import { Hono } from "hono"
import { fail } from "../lib/http.ts"

export const fileRoutes = new Hono()

const IMMUTABLE = "public, max-age=31536000, immutable"

async function serve(key: string) {
  const object = await env.FILES.get(key)
  if (!object) fail(404, "Not found")
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": IMMUTABLE,
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "x-content-type-options": "nosniff",
    },
  })
}

fileRoutes.get("/icons/:name{[0-9a-f]{40}\\.(svg|png|webp)}", (c) => serve(`icons/${c.req.param("name")}`))
fileRoutes.get("/screenshots/:name{[0-9a-f]{64}\\.(png|webp|jpg)}", (c) =>
  serve(`screenshots/${c.req.param("name")}`),
)
