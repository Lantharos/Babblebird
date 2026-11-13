import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { db, schema } from "../db/core.ts"
import { fail, readQuery } from "../lib/http.ts"

export type NoticeKind = (typeof schema.NOTICE_KINDS)[number]

export const PREFERENCE = {
  reply: "emailReplies",
  strings: "emailStrings",
  announcement: "emailAnnouncements",
} as const satisfies Record<NoticeKind, string>

async function sign(userId: string, kind: NoticeKind) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.BETTER_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`unsubscribe:${userId}:${kind}`))
  return new Uint8Array(mac).toBase64({ alphabet: "base64url", omitPadding: true })
}

export async function unsubscribeUrl(userId: string, kind: NoticeKind) {
  const query = new URLSearchParams({ u: userId, k: kind, t: await sign(userId, kind) })
  return `${env.PUBLIC_URL}/api/unsubscribe?${query}`
}

export const unsubscribeRoutes = new Hono()

const link = z.object({ u: z.string().min(1), k: z.enum(schema.NOTICE_KINDS), t: z.string().min(1) })

async function apply(query: z.infer<typeof link>) {
  if (query.t !== (await sign(query.u, query.k))) fail(403, "That link isn't valid")
  await db
    .update(schema.user)
    .set({ [PREFERENCE[query.k]]: false })
    .where(eq(schema.user.id, query.u))
}

unsubscribeRoutes.get("/", async (c) => {
  const query = readQuery(c, link)
  await apply(query)
  return c.redirect(`${env.PUBLIC_URL}/unsubscribed?kind=${query.k}`)
})

unsubscribeRoutes.post("/", async (c) => {
  await apply(readQuery(c, link))
  return c.body(null, 204)
})
