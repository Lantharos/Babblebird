import type { Person } from "@babblebird/protocol"
import { inArray } from "drizzle-orm"
import { db, schema } from "../db/core.ts"

export async function peopleById(ids: (string | null)[]) {
  const wanted = [...new Set(ids.filter((id) => id !== null))]
  if (!wanted.length) return new Map<string, Person>()
  const users = await db
    .select({ id: schema.user.id, name: schema.user.name, image: schema.user.image })
    .from(schema.user)
    .where(inArray(schema.user.id, wanted))
  return new Map(users.map((user) => [user.id, { ...user, name: user.name || "A translator" }]))
}

export function personOf(
  people: Map<string, Person>,
  by: string | null,
  credit: string | null,
): Person | null {
  if (by) return people.get(by) ?? { id: by, name: "A translator", image: null }
  return credit ? { id: null, name: credit, image: null } : null
}
