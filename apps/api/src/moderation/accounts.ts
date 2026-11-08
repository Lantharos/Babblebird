import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"

export const SUSPENDED =
  "This account is suspended. Write to hello@babblebird.dev if you think that's a mistake."

export async function isSuspended(userId: string) {
  const [found] = await db
    .select({ suspendedAt: schema.user.suspendedAt })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
  return !!found?.suspendedAt
}

export async function revokeSessions(userId: string) {
  const revoked = await db
    .delete(schema.session)
    .where(eq(schema.session.userId, userId))
    .returning({ id: schema.session.id })
  return revoked.length
}

export async function suspend(userId: string, reason: string) {
  await db
    .update(schema.user)
    .set({ suspendedAt: new Date(), suspendedReason: reason })
    .where(eq(schema.user.id, userId))
  await revokeSessions(userId)
}

export async function reinstate(userId: string) {
  await db
    .update(schema.user)
    .set({ suspendedAt: null, suspendedReason: null })
    .where(eq(schema.user.id, userId))
}

export async function deleteAccount(userId: string) {
  await db.delete(schema.user).where(eq(schema.user.id, userId))
}
