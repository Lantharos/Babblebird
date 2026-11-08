import { createMiddleware } from "hono/factory"
import { fail } from "../lib/http.ts"
import { auth } from "./auth.ts"

export interface Viewer {
  id: string
  name: string
  email: string
  image: string | null
}

export type ViewerVars = { Variables: { viewer: Viewer | null } }
export type SignedInVars = { Variables: { viewer: Viewer } }

export const maybeSignedIn = createMiddleware<ViewerVars>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set("viewer", session ? { ...session.user, image: session.user.image ?? null } : null)
  await next()
})

export const signedIn = createMiddleware<SignedInVars>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) fail(401, "Sign in first")
  c.set("viewer", { ...session.user, image: session.user.image ?? null })
  await next()
})
