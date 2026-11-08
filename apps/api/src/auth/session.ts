import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import { fail } from "../lib/http.ts"
import { isSuspended, SUSPENDED } from "../moderation/accounts.ts"
import { auth } from "./auth.ts"

export interface Viewer {
  id: string
  name: string
  email: string
  image: string | null
}

export type ViewerVars = { Variables: { viewer: Viewer | null } }
export type SignedInVars = { Variables: { viewer: Viewer } }

async function viewerOf(c: Context): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return null
  if (c.req.method !== "GET" && (await isSuspended(session.user.id))) fail(403, SUSPENDED)
  return { ...session.user, image: session.user.image ?? null }
}

export const maybeSignedIn = createMiddleware<ViewerVars>(async (c, next) => {
  c.set("viewer", await viewerOf(c))
  await next()
})

export const signedIn = createMiddleware<SignedInVars>(async (c, next) => {
  const viewer = await viewerOf(c)
  if (!viewer) fail(401, "Sign in first")
  c.set("viewer", viewer)
  await next()
})
