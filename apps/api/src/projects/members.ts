import type { Member } from "@babblebird/protocol"
import { and, eq, or } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { maybeSignedIn, type ViewerVars } from "../auth/session.ts"
import { db, schema } from "../db/core.ts"
import { fail, readBody } from "../lib/http.ts"
import { abilitiesOf, visibleProject } from "./access.ts"

export const memberRoutes = new Hono<ViewerVars>()
memberRoutes.use(maybeSignedIn)

async function asAdmin(owner: string, name: string, viewer: ViewerVars["Variables"]["viewer"]) {
  const found = await visibleProject(owner, name, viewer)
  if (!abilitiesOf(found.project, viewer, found.member).admin)
    fail(403, "Only the project's maintainers can do this")
  return found.project
}

memberRoutes.get("/:owner/:name/members", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const rows = await db
    .select({ member: schema.member, user: schema.user })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(eq(schema.member.projectId, project.id))
  const invitations = await db
    .select()
    .from(schema.invitation)
    .where(eq(schema.invitation.projectId, project.id))
  return c.json({
    invitations: invitations.map((invite) => ({
      who: invite.who,
      role: invite.role,
      languages: invite.languages,
      areas: invite.areas,
    })),
    members: rows.map(
      ({ member, user }): Member => ({
        userId: user.id,
        name: user.name,
        image: user.image,
        githubLogin: user.githubLogin,
        role: member.role,
        languages: member.languages ?? null,
        areas: member.areas ?? null,
        fromGithub: member.fromGithub,
      }),
    ),
  })
})

memberRoutes.delete("/:owner/:name/invitations/:who", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  await db
    .delete(schema.invitation)
    .where(
      and(
        eq(schema.invitation.projectId, project.id),
        eq(schema.invitation.who, c.req.param("who").toLowerCase()),
      ),
    )
  return c.body(null, 204)
})

const membership = z.object({
  who: z.string().trim().min(1),
  role: z.enum(schema.ROLES),
  languages: z.array(z.string()).nullable(),
  areas: z.array(z.string()).nullable(),
})

memberRoutes.put("/:owner/:name/members", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  const { who, role, languages, areas } = await readBody(c, membership)
  const handle = who.replace(/^@/, "")
  const user = await db.query.user.findFirst({
    where: or(eq(schema.user.email, handle.toLowerCase()), eq(schema.user.githubLogin, handle)),
  })
  if (!user) {
    const invite = { role, languages, areas }
    await db
      .insert(schema.invitation)
      .values({ projectId: project.id, who: handle.toLowerCase(), ...invite })
      .onConflictDoUpdate({ target: [schema.invitation.projectId, schema.invitation.who], set: invite })
    return c.json({ invited: true })
  }
  const values = { role, languages, areas, fromGithub: false, checkedAt: null }
  await db
    .insert(schema.member)
    .values({ projectId: project.id, userId: user.id, ...values })
    .onConflictDoUpdate({ target: [schema.member.projectId, schema.member.userId], set: values })
  return c.json({ invited: false })
})

memberRoutes.delete("/:owner/:name/members/:user", async (c) => {
  const project = await asAdmin(c.req.param("owner"), c.req.param("name"), c.get("viewer"))
  await db
    .delete(schema.member)
    .where(and(eq(schema.member.projectId, project.id), eq(schema.member.userId, c.req.param("user"))))
  return c.body(null, 204)
})
