import { env } from "cloudflare:workers"
import { and, eq, ne } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { db, schema } from "../db/core.ts"
import { all, eachRow, first, runAll, shard } from "../db/strings.ts"
import { putOnce } from "../lib/files.ts"
import { fail } from "../lib/http.ts"
import { imageSize } from "./images.ts"
import { verifyWorkflow } from "./oidc.ts"

export const screenshotRoutes = new Hono()

const MAX_IMAGE = 10 * 1024 * 1024
const MAX_SCREENSHOTS = 100

const manifest = z.object({
  commit: z.string().optional(),
  screenshots: z
    .array(
      z.object({
        file: z.string().min(1),
        name: z.string().min(1).max(200),
        lang: z.string().default("en"),
        strings: z
          .array(
            z.object({
              key: z.string().min(1),
              file: z.string().optional(),
              box: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
            }),
          )
          .max(2000),
      }),
    )
    .min(1)
    .max(MAX_SCREENSHOTS),
})

async function sha256(bytes: ArrayBuffer) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)).toHex()
}

const patternOf = (path: string) => path.replace(/\/locales\/[^/]+\//, "/locales/{lang}/")

screenshotRoutes.post("/:owner/:name/screenshots", async (c) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) fail(401, "Send a GitHub Actions token")
  const claims = await verifyWorkflow(token).catch(() =>
    fail(401, "That token isn't from GitHub Actions for this audience"),
  )
  const project = await db.query.project.findFirst({
    where: and(
      eq(schema.project.slug, `${c.req.param("owner")}/${c.req.param("name")}`.toLowerCase()),
      ne(schema.project.state, "removed"),
    ),
  })
  if (!project || String(project.repoId) !== claims.repository_id)
    fail(403, "This workflow doesn't belong to that project")
  const form = await c.req.formData()
  const parsed = manifest.parse(JSON.parse(String(form.get("manifest") ?? "null")))
  const strings = shard(project)
  const keys = [...new Set(parsed.screenshots.flatMap((shot) => shot.strings.map((entry) => entry.key)))]
  const sources = await all<{ id: number; key: string; pattern: string }>(
    strings
      .prepare(
        `SELECT s.id, s.key, f.pattern FROM source s JOIN file f ON f.id = s.file_id
         WHERE s.project_id = ?1 AND s.key IN (SELECT value FROM json_each(?2))`,
      )
      .bind(project.id, JSON.stringify(keys)),
  )
  const byKey = Map.groupBy(sources, (source) => source.key)
  const unknown = new Set<string>()
  let linked = 0
  for (const shot of parsed.screenshots) {
    const file = form.get(shot.file)
    if (!(file instanceof File) || file.size > MAX_IMAGE)
      fail(422, `${shot.file} is missing or bigger than 10 MB`)
    const bytes = await file.arrayBuffer()
    const size = imageSize(new Uint8Array(bytes))
    if (!size) fail(422, `${shot.file} isn't a PNG or WebP image`)
    const image = `${await sha256(bytes)}.${size.extension}`
    if (!(await env.FILES.head(`screenshots/${image}`)))
      await putOnce(`screenshots/${image}`, bytes, size.type)
    const row = await first<{ id: number }>(
      strings
        .prepare(
          `INSERT INTO screenshot (project_id, name, image, width, height, lang, commit_sha, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (project_id, name, lang) DO UPDATE SET image = excluded.image, width = excluded.width,
             height = excluded.height, commit_sha = excluded.commit_sha, at = excluded.at RETURNING id`,
        )
        .bind(
          project.id,
          shot.name,
          image,
          size.width,
          size.height,
          shot.lang,
          parsed.commit ?? claims.sha,
          Date.now(),
        ),
    )
    const shots = shot.strings.flatMap((entry) => {
      const matches = (byKey.get(entry.key) ?? []).filter(
        (source) => !entry.file || source.pattern === patternOf(entry.file),
      )
      if (!matches.length) unknown.add(entry.key)
      return matches.map((source) => [source.id, ...(entry.box ?? [null, null, null, null])])
    })
    linked += shots.length
    await runAll(strings, [
      strings.prepare("DELETE FROM shot WHERE screenshot_id = ?").bind(row!.id),
      ...eachRow(
        strings,
        `INSERT OR REPLACE INTO shot (source_id, screenshot_id, x, y, w, h)
         SELECT j.value->>0, ?1, j.value->>1, j.value->>2, j.value->>3, j.value->>4 FROM json_each(?2) j`,
        shots,
        row!.id,
      ),
    ])
  }
  return c.json({ screenshots: parsed.screenshots.length, strings: linked, unknown: [...unknown] })
})
