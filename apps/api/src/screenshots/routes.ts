import { env } from "cloudflare:workers"
import { and, eq, ne } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { db, schema } from "../db/core.ts"
import { putOnce } from "../lib/files.ts"
import { fail } from "../lib/http.ts"
import { stringsOf } from "../strings/client.ts"
import { imageSize } from "./images.ts"
import { verifyWorkflow } from "./oidc.ts"
import type { StoredScreenshot } from "./store.ts"

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
  const stored: StoredScreenshot[] = []
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
    stored.push({
      name: shot.name,
      lang: shot.lang,
      image,
      width: size.width,
      height: size.height,
      commit: parsed.commit ?? claims.sha,
      strings: shot.strings.map((entry) => ({
        key: entry.key,
        pattern: entry.file ? patternOf(entry.file) : null,
        box: entry.box ?? null,
      })),
    })
  }
  const { linked, unknown } = await stringsOf(project).saveScreenshots(stored)
  return c.json({ screenshots: parsed.screenshots.length, strings: linked, unknown })
})
