import type { SitemapProject } from "@babblebird/protocol"
import { and, eq, isNull } from "drizzle-orm"
import { Hono } from "hono"
import { db, schema } from "../db/core.ts"

export const sitemapRoutes = new Hono()

sitemapRoutes.get("/sitemap", async (c) => {
  const rows = await db
    .select({
      slug: schema.project.slug,
      languages: schema.project.languages,
      updatedAt: schema.project.updatedAt,
    })
    .from(schema.project)
    .where(
      and(
        eq(schema.project.state, "ready"),
        eq(schema.project.private, false),
        isNull(schema.project.pausedAt),
      ),
    )
    .orderBy(schema.project.slug)
  return c.json(
    rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })) satisfies SitemapProject[],
  )
})
