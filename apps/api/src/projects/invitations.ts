import { inArray } from "drizzle-orm"
import { db, schema } from "../db/core.ts"

export async function claimInvitations(userId: string, handles: (string | null | undefined)[]) {
  const wanted = handles.filter((handle): handle is string => !!handle).map((handle) => handle.toLowerCase())
  if (!wanted.length) return
  const found = await db.select().from(schema.invitation).where(inArray(schema.invitation.who, wanted))
  for (const invite of found) {
    await db
      .insert(schema.member)
      .values({
        projectId: invite.projectId,
        userId,
        role: invite.role,
        languages: invite.languages,
        areas: invite.areas,
      })
      .onConflictDoNothing()
  }
  if (found.length) await db.delete(schema.invitation).where(inArray(schema.invitation.who, wanted))
}
