import { env } from "cloudflare:workers"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { db, schema } from "../db/core.ts"
import { type BrandBadge, badgeSvg, brandBadgeSvg, colorFor } from "./svg.ts"

export const badgeRoutes = new Hono()

const MAX_AGE = 600

async function badge(owner: string, name: string, lang: string | undefined) {
  const project = await db.query.project.findFirst({
    where: and(eq(schema.project.slug, `${owner}/${name}`.toLowerCase()), eq(schema.project.private, false)),
  })
  if (!project?.strings || !project.languages.length) return badgeSvg("translated", "not yet", "#6f6b62")
  const done = Object.entries(project.progress)
    .filter(([code]) => !lang || code === lang)
    .reduce((sum, [, progress]) => sum + progress.translated - progress.review, 0)
  const languages = lang ? 1 : project.languages.length
  const stored = project.icon ? await env.FILES.get(`icons/${project.icon}`) : null
  const icon = stored
    ? `data:${stored.httpMetadata?.contentType};base64,${new Uint8Array(await stored.arrayBuffer()).toBase64()}`
    : null
  const percent = Math.floor((done / (project.strings * languages)) * 100)
  return badgeSvg(lang ? `translated · ${lang}` : "translated", `${percent}%`, colorFor(percent), icon)
}

badgeRoutes.get("/:kind{(?:translated|help|compact)\\.svg}", (c) =>
  c.body(
    brandBadgeSvg(
      c.req.param("kind").slice(0, -4) as BrandBadge,
      c.req.query("theme") === "dark" ? "dark" : "light",
    ),
    200,
    { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" },
  ),
)

badgeRoutes.get("/:owner/:file{.+\\.svg}", async (c) => {
  const cache = (caches as unknown as { default: Cache }).default
  const cached = await cache.match(c.req.raw)
  if (cached) return cached
  const response = new Response(
    await badge(c.req.param("owner"), c.req.param("file").slice(0, -4), c.req.query("lang")),
    {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": `public, max-age=${MAX_AGE}, s-maxage=${MAX_AGE}`,
      },
    },
  )
  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()))
  return response
})
