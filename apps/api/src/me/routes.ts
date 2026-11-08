import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, signedIn, type ViewerVars } from "../auth/session.ts"
import { db, schema } from "../db/core.ts"
import { readBody } from "../lib/http.ts"

export const meRoutes = new Hono<ViewerVars>()

meRoutes.get("/", maybeSignedIn, async (c) => {
  const viewer = c.get("viewer")
  if (!viewer) return c.json(null)
  const user = await db.query.user.findFirst({ where: eq(schema.user.id, viewer.id) })
  return c.json({
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    image: viewer.image,
    githubLogin: user?.githubLogin ?? null,
    languages: user?.languages ?? [],
  })
})

const tag = z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)

meRoutes.put("/languages", signedIn, async (c) => {
  const { languages } = await readBody(c, z.object({ languages: z.array(tag).max(20) }))
  await db
    .update(schema.user)
    .set({ languages })
    .where(eq(schema.user.id, c.get("viewer")!.id))
  return c.body(null, 204)
})
